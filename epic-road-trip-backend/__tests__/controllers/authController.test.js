const authController = require('../../controllers/authController');
const User = require('../../models/userModel'); 
const mongoose = require('mongoose');

jest.mock('../../models/userModel');

describe('Auth Controller', () => {
  let mockReq, mockRes;
  let consoleErrorSpy;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks(); 
    let tempIdCounter = 0;
    mongoose.Types.ObjectId.mockImplementation(() => `mockUserId_${tempIdCounter++}`);


    User.findOne.mockImplementation(() => ({ 
        exec: jest.fn().mockResolvedValue(null), 
        then: function(onFulfilled) { return Promise.resolve(null).then(onFulfilled); },
    }));
    
    User.mockImplementation(userData => {
      const generatedId = new mongoose.Types.ObjectId().toString();
      const userInstance = {
        ...userData,
        _id: userData._id || generatedId,
        username: userData.username.toLowerCase(),
        save: jest.fn().mockResolvedValue({
            ...userData,
            _id: userData._id || generatedId,
            username: userData.username.toLowerCase(),
        }),
      };
      return userInstance;
    });

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockReq.body = { username: 'TestUser', password: 'password123' };
      User.findOne.mockResolvedValue(null); 

      await authController.register(mockReq, mockRes);
      
      const expectedUsername = 'testuser';
      expect(User.findOne).toHaveBeenCalledWith({ username: expectedUsername });
      expect(User).toHaveBeenCalledWith({ username: expectedUsername, password: 'password123' });
      
      const mockUserInstance = User.mock.results[0].value;
      expect(mockUserInstance.save).toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const savedUser = await mockUserInstance.save.mock.results[0].value;
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
        userId: savedUser._id,
        username: savedUser.username,
      });
    });

    it('should return 400 if username or password is missing', async () => {
      mockReq.body = { username: 'testuser' };
      await authController.register(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Username and password are required.' });

      mockReq.body = { password: 'password123' };
      await authController.register(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Username and password are required.' });
    });

    it('should return 400 if username already exists', async () => {
      mockReq.body = { username: 'existinguser', password: 'password123' };
      User.findOne.mockResolvedValue({ username: 'existinguser' });

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Username already exists.' });
    });

    it('should handle errors during registration', async () => {
      mockReq.body = { username: 'testuser', password: 'password123' };
      User.findOne.mockResolvedValue(null);
      const error = new Error('DB save error');
      
      User.mockImplementationOnce(() => ({
          username: 'testuser',
          password: 'password123',
          save: jest.fn().mockRejectedValue(error)
      }));

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error registering user',
        error: error.message,
      });
      expect(console.error).toHaveBeenCalledWith("Registration error:", error);
    });
  });

  describe('login', () => {
    it('should login an existing user successfully', async () => {
      mockReq.body = { username: 'TestUser', password: 'password123' };
      const mockUser = { 
        _id: 'user123', 
        username: 'testuser',
        password: 'password123' 
      };
      User.findOne.mockResolvedValue(mockUser);

      await authController.login(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Login successful',
        userId: 'user123',
        username: 'testuser',
      });
    });

    it('should return 400 if username or password is missing for login', async () => {
      mockReq.body = { username: 'testuser' };
      await authController.login(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Username and password are required.' });
    });

    it('should return 401 if user not found', async () => {
      mockReq.body = { username: 'nonexistent', password: 'password123' };
      User.findOne.mockResolvedValue(null);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials (user not found).' });
    });

    it('should return 401 if password incorrect', async () => {
      mockReq.body = { username: 'testuser', password: 'wrongpassword' };
      const mockUser = { _id: 'user123', username: 'testuser', password: 'correctpassword' };
      User.findOne.mockResolvedValue(mockUser);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials (password incorrect).' });
    });

    it('should handle errors during login', async () => {
      mockReq.body = { username: 'testuser', password: 'password123' };
      const error = new Error('DB find error');
      User.findOne.mockRejectedValue(error);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error logging in',
        error: error.message,
      });
      expect(console.error).toHaveBeenCalledWith("Login error:", error);
    });
  });
});