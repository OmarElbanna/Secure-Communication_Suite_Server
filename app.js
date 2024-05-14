const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {});
const bcrypt = require('bcrypt');

const MongoClient = require('mongodb').MongoClient
const uri = "mongodb+srv://omarelbanna:AtieyhIE9Xj2wCKk@security.yxz4gwr.mongodb.net/?retryWrites=true&w=majority&appName=security";
const client = new MongoClient(uri);
let db;
let users;
let keys;
async function connect() {
    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        db = client.db("Security");
        users = db.collection("Users");
        keys = db.collection("Keys"); 
    }
  }
connect().catch(console.dir);

const createUser = async (username, hashedPassword,publicKey) =>{
    try{
        const user = await users.findOne({"username":username});
        if(user){
            return {success:false, message:"User exists"};
        }
        await users.insertOne({"username":username,"password":hashedPassword});
        await keys.insertOne({"username":username,"key":publicKey});
        return{success : true, message:'User has been created successfully'};
    }
    catch (error) {
        console.error('Error during signup:', error);
        return { success: false, message: 'server error' };
      }

};

const authenticateUser = async (username, hashedPassword) => {
    try {
      const user = await users.findOne({ "username":username });
      if (!user) {
        return { success: false, message: 'User not found.' };
      }
      console.log(user.password);
      console.log(hashedPassword);
      const passwordMatch = user.password === hashedPassword ;
      console.log(passwordMatch);
      if (!passwordMatch) {
        return { success: false, message: 'Invalid password.' };
      }
  
      return { success: true, user };
    } catch (error) {
      console.error('Error during authentication:', error);
      return { success: false, message: 'server error' };
    }
  };

  io.on('connection', (socket) => {
    console.log('A user connected');
  
    socket.on('login', async ({ username, hashedPassword }) => {
        const { success, message, user } = await authenticateUser(username, hashedPassword);
        if (success) {
          socket.user = user;
          socket.emit('loginResponse', { success: true, message: 'Login successful', user });
        } else {
          socket.emit('loginResponse', { success: false, message });
        }
      });
      

    socket.on('signup',async({username, hashedPassword,publicKey})=>{
        const {success, message} = await createUser(username,hashedPassword,publicKey);

        if(success){
            socket.emit('signupResponse', { success: true, message: 'Signup successful'});
        }
        else{
            socket.emit('signupResponse', { success: false, message});
        }
    });
    

  });

  const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});