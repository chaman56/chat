const app = require('express')()
const mongoose = require('mongoose')
const bodyparser = require('body-parser');
const dotenv = require('dotenv');
const User = require('./model/user');
const Chat = require('./model/chats');
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(bodyparser.urlencoded({extended:true}))
dotenv.config({path: 'config.env'})
app.set("view engine","ejs");

const connectDB = async ()=>{
  try{
    const con = await mongoose.connect(process.env.mongourl,{
      useNewUrlParser:true,
      useUnifiedTopology:true,
    })
    console.log(`mongodb connected :${con.connection.host}`)
  }catch(err){
    console.log(err)
    process.exit(1)
  }
}
connectDB();

app.get('/',(req, res)=>{
  res.render('index');
})
app.get('/login',(req, res)=>{
  res.render('login');
})
app.get('/signup',(req, res)=>{
  res.render('signup');
})
app.post('/adduser', (req,res)=>{
  if(!req.body){
    res.status(404).send({message : "Can not send empty request!"})
    return;
  }
  const user = new User({
    firstname : req.body.firstname,
    lastname : req.body.lastname,
    email : req.body.email,
    username : req.body.username,
    password : req.body.password
  })
  user.save(user).then(user => {
    res.redirect('login');
  }).catch(err=>{
    res.status(500).send({message : err.message || "Some error occured while creating!"})
  })
})

app.get('/getin', (req,res)=>{
  if(!req.body){
    res.status(404).send({message : "Can not send empty request!"})
    return;}
  User.find({username : req.query.username, password : req.query.password}).then(data=>{
    Chat.find().then(chatdata =>{
      res.render('user',{user:data[0],chats:chatdata})
    })
  }).catch(err=>{
    res.send({message: "Invalid login details! Try again with correct credentials."})
  })
})

var users = 0;
io.on('connection',(socket)=>{
  users++;
  io.sockets.emit('online', {text:users + " online"});

  socket.on('message',(data)=>{
    socket.emit('broadcastme',data);
    socket.broadcast.emit('broadcast', data);
    var chat = new Chat({
      username : data.user,
      text : data.text
    })
    chat.save(chat)
  })
  
  socket.on('disconnect',function(){
    users--;
    io.sockets.emit('online',{text:users+" online"})
  })
})

var PORT = process.env.PORT || 3000
http.listen(PORT,()=>{
  console.log(`listening on http://localhost:${PORT}`);
})
