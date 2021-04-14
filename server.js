const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('file-system');
const postgres = require('postgres');
let User = require('./user.json');
const { isError } = require('util');
const app = express();

const storage = multer.diskStorage({
  destination: './public/image/profile',
  filename: function(req, file, cb){
      cb(null, file.originalname);
  }
})
const storage1 = multer.diskStorage({
  destination: './public/image/chat',
  filename: function(req, file, cb){
      cb(null, file.originalname);
  }
})
const uploadProfile = multer({
  storage: storage
})
const uploadFile = multer({
  storage: storage1
})




const port = 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server })
app.use(express.static('public'));
app.use(express.urlencoded({extended: false, limit: '50mb'}))
app.use(express.json({limit: '50mb'}));
const sql = postgres('postgres://postgres:1997PEpa@localhost:5432')
const saltRounds = 10

async function createDatabase() {
  try{
    const response = await sql`CREATE SCHEMA feedback;`
  console.log(response)
  }catch (err){
    console.log('DB already exists') 
  }
  const response1 = await sql`CREATE TABLE IF NOT EXISTS feedback.Login(
    email varchar(50) not null primary key,
    password varchar not null
  );`;
  const response2 = await sql`CREATE TABLE IF NOT EXISTS feedback.Users(
    id serial not null primary key,
    nickname varchar(40) not null,
    photo varchar not null,
    name varchar(30),
    surname varchar(40),
    email varchar(50) not null
  );`;
  const response3 = await sql`CREATE TABLE IF NOT EXISTS feedback.Room(
    id serial not null primary key,
    room varchar(40) not null,
    users varchar not null,
    amin int references feedback.Users(id)
  );`;
  try{
    const response3B = await sql`insert into feedback.Room (id, room, users) values (0, 'room1', 'everybody');`
  }catch(err){ 
    console.log('room1 exists', err) 
  }
 
  const response4 = await sql`CREATE TABLE IF NOT EXISTS feedback.Friends(
    id int not null  REFERENCES feedback.Users(id),
    friend int not null  REFERENCES feedback.Users(id)
  );`;
  const response5 = await sql`CREATE TABLE IF NOT EXISTS feedback.Notifs(
    id int not null  REFERENCES feedback.Users(id),
    text int not null  REFERENCES feedback.Users(id),
    friendRequest varchar not null
  );`;
  const response6 = await sql`CREATE TABLE IF NOT EXISTS feedback.Message(
    message_id serial not null primary key,
    file varchar,
    link varchar,
    text varchar,
    time varchar not null,
    type varchar,
    room int not null REFERENCES feedback.Room(id),
    id int not null REFERENCES feedback.Users(id),
    img varchar not null,
    name varchar(45) not null
  );`;
  console.log('1',response1)
  console.log('2',response2)
  console.log('3',response3)
  console.log('4',response4)
  console.log('5',response5) 
  console.log('6',response6) 
}  
createDatabase()



app.post('/users', async(req, res) => {
if (req.body.id === null){
  res.json(User[0])
}else if (req.body.id){
  //const user = await sql`select id, nickname, photo from feedback.Users where id = ${req.body.id};`
  if (User.length > 1){
    for (const user of User){
      if (user.id === JSON.parse(req.body.id) && user.symbol === req.body.symbol){
        res.json(user)
      }else if (user.id === JSON.parse(req.body.id) && user.symbol !== req.body.symbol){
        res.json(User[0])
      }
    }
  }else{
    res.json(User[0])
  }
}
})

app.post('/leftUsers', async(req, res) => {
  const allFriends = await sql`select friend from feedback.Friends where id = ${req.body.id};`
  let leftUsers = allFriends.filter(friend => {
    return !req.body.roomUsers.includes(friend.friend)
  })
  let finArrOfUsers = []
  for (const id of leftUsers){
    const user = await sql`select id, nickname, photo from feedback.Users where id = ${id.friend};`
    finArrOfUsers.push(user[0])
  }
  res.json(finArrOfUsers)
})

app.post('/goToRoom', (req, res) => {
  if (req.body.id !== null){
    for (const user of User){
      if (user.id === JSON.parse(req.body.id)){
        user.wholeRoom = req.body.room
        user.room = req.body.room.id
      }
    }
    res.json(true)
  }else { 
    res.json(false)
  } 
})

app.delete('/deleteRoom', async(req, res) => {
  const deleteMsg = await sql`delete from feedback.Message where room = ${req.body.id};`
  const deleteIt = await sql`delete from feedback.Room where id = ${req.body.id} returning id, room, users, admin;`
  for (const user of User){
    if (user.wholeRoom.id === JSON.parse(req.body.id)){
      user.room = 0
      user.wholeRoom = {id: 0, room: 'room1', users: 'everybody', admin: null}
    }
  }
  res.json(deleteIt[0])
})
 
app.post('/register',uploadProfile.single('m_file'), async(req, res) => {
  let {nickname, email, password, name, surname} = JSON.parse(req.body.user)
  bcrypt.genSalt(saltRounds, async function(err, salt) {
    bcrypt.hash(password, salt, async function(err, hash) {
      const response = await sql`insert into feedback.Login (email, password) values (${email}, ${hash});`
      const response1 = await sql`insert into feedback.Users (nickname, photo, name, surname, email) values
       (${nickname}, ${req.file.originalname}, ${name}, ${surname}, ${email});`
      res.json(true)
    }); 
});
  
  //console.log(response, response1)
})

app.put('/addUsers', async(req, res) => {
  let justIDArr = []
 for (const user of req.body.room.users){
  justIDArr.push(user.id)
 }
 for (const id of req.body.users){
   const nextUser = await sql`select id, nickname, photo from feedback.Users where id = ${id};`
   req.body.room.users.push(nextUser[0])
   justIDArr.push(id)
 }
 let arr = JSON.stringify(justIDArr)
 const updateDbRoom = await sql`update feedback.Room set users = ${arr} where id = ${req.body.room.id};`
 for (const user of User){
   if(user.id === req.body.admin){
     user.wholeRoom.users = req.body.room.users
   }
 }
 res.json(req.body.room)
}) 

app.post('/user', async(req, res) => {
  if (req.body.email !== '' && req.body.password !== ''){
    const response = await sql`select email, password from feedback.Login where email = ${req.body.email};`
    if (response.length !== 0){
    bcrypt.compare(req.body.password, response[0].password, async function(err, result) {
      if (result){
        const user = await sql`select id, nickname, photo from feedback.Users where email = ${req.body.email};`
        let User1 = {
            id: user[0].id,
            nickname: user[0].nickname,
            photo: user[0].photo,
            room: 0,
            wholeRoom: {id: 0, room: 'room1', users: 'everybody', admin: null},
            symbol: req.body.symbol
        }
        let arrOfId = []
        for (const user of User){
          arrOfId.push(user.id)
        }
        if (!arrOfId.includes(User1.id)){
          User.push(User1)
          res.json({
            bool: true,
            user: User1
        })
        }else {
          res.json({
            bool: false,
            text: 'User already signed in'
        })
        }  
      }else{
        res.json({
          bool: false,
          text: 'Incorrect password'
      })
      }
  }) 
 }else{
   res.json({
    bool: false,
    text: 'Incorrect email'
})
 }
}else{
  res.json({
    bool: false,
    text: 'Failed to sign in.'
})
if (req.body.id !== null){
const newUser = User.filter(user => {
  return user.id !== req.body.id
})
User = newUser
}
}
}) 
  /* if (){
  const user = Users.filter(user => {return user.name === req.body.name})
  if (user.length !== 0){
  User.name = req.body.name
  User.photo = req.body.photo
  res.json(user)
  }else{
    res.json(user)
  }
  }else{
    User.name = req.body.name
    User.photo = req.body.photo
    res.json([]) 
  }*/
app.get('/:id', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})

app.get('/chat.html/:id', (req, res) => {
  res.sendFile(__dirname + '/public/chat.html')
})

app.post('/notifs', async(req, res) => {
  const Notifs = await sql`select id, text, friendRequest from feedback.Notifs where id = ${req.body.id};`
  for (const notif of Notifs){
    const nickname = await sql`select nickname from feedback.Users where id = ${notif.text};`
    notif.name = nickname[0].nickname
  }
  res.json(Notifs) 
})

app.post('/rooms', async(req, res) => {
  let id = req.body.id
  console.log(id)
  const userRooms = await sql`select id, room, users, admin from feedback.Room where users like ${'%[' + id + ']%'} or 
  users like ${'%[' + id + ',%'} or users like ${'%,' + id + ']%'} or users like ${'%,' + id + ',%'} or users = 'everybody';`
  for (const room of userRooms){
    let roomsF = []
    if (room.users !== 'everybody'){
      let users = JSON.parse(room.users)
      //console.log(users)
      for (const user of users){
        const nickname = await sql`select nickname, photo from feedback.Users where id = ${user};`
        if (user === room.admin){
          room.admin = {id: room.admin, nickname: nickname[0].nickname, photo: nickname[0].photo}
        }
        roomsF.push({id: user, nickname: nickname[0].nickname, photo: nickname[0].photo})
      }
      room.users = roomsF
    }
  }
  res.json(userRooms);
})

app.post('/createFriendShip', async(req, res) => {
  if (req.body.event === 'accept'){
    const pushFirst = await sql`
    insert into feedback.Friends (id, friend) values (${req.body.id}, ${req.body.friend});`
    const pushSecond = await sql`
    insert into feedback.Friends (id, friend) values (${req.body.friend}, ${req.body.id});`
    const deleteNotif = await sql`delete from feedback.Notifs where id = ${req.body.id} and text = ${req.body.friend};`
    console.log(pushFirst, pushSecond)
    res.json(true)

  }else{
    const deleteNotif = await sql`delete from feedback.Notifs where id = ${req.body.id} and text = ${req.body.friend};`
    console.log(deleteNotif)
    res.json('notaccept')
  }
}) 

app.delete('/deleteFriend', async(req, res) => {
  const deletefriend = await sql`delete from feedback.Friends where id = ${req.body.id} and friend = ${req.body.friend};`
  const deletefriend2 = await sql`delete from feedback.Friends where id = ${req.body.friend} and friend = ${req.body.id};`
  res.json(true)
})

app.put('/dropUser', async(req, res) => {
  let users = req.body.room.users
  let newUsers = []
  for (const user of users){
    if (user.id !== req.body.userID){
      newUsers.push(user.id)
    }
  }
  const updateRoom = await sql`update feedback.Room set users = ${JSON.stringify(newUsers)} where id = ${req.body.room.id} returning users;`
  if (req.body.room.id !== undefined){
    const arrOfUsers = req.body.room.users.filter(user => {
      return user.id !== req.body.userID
    })
    req.body.room.users = arrOfUsers
  }
  for (const user of User){
    if (user.id === req.body.id){
      user.wholeRoom.users = req.body.room.users
    }else if (user.id === req.body.userID && user.wholeRoom.id === req.body.room.id){
      user.room = 0
      user.wholeRoom = {id:0, room: 'room1', users: 'everybody', admin: null }
    }
  }
  res.json(req.body.room)
})

app.put('/leaveRoom', async(req, res) => {
if (req.body.room.id !== undefined){
  let users = req.body.room.users
  let newUsers = []
  for (const user of users){
    if (user.id !== req.body.userID){
      newUsers.push(user.id)
    }
  }
  const updateRoom = await sql`update feedback.Room set users = ${JSON.stringify(newUsers)} where id = ${req.body.room.id} returning users;`
    const arrOfUsers = req.body.room.users.filter(user => {
      return user.id !== req.body.userID
    })
    req.body.room.users = arrOfUsers
    for (const user of User){
      if (newUsers.includes(user.id) && user.wholeRoom.id === req.body.room.id){
        user.wholeRoom.users =  req.body.room.users
      }else if (user.id === req.body.userID && user.wholeRoom.id === req.body.room.id){
        user.room = 0
        user.wholeRoom = {id: 0, room: 'room1', users: 'everybody', admin: null}
      }
    }
  }
  res.json(req.body.room)
})

app.post('/createRoom', async(req, res) => {
  const saveRoom = await sql`insert into feedback.Room (room, users, admin) values (${req.body.room}, ${req.body.users}, ${req.body.admin});`
  res.json(true)
})

app.post('/getFriends', async(req, res) => {
  const friends = await sql`select friend from feedback.Friends where id = ${req.body.id};`
  let realFriends = []
  for (const friend of friends){
    const idAndName = await sql`select id, nickname, photo from feedback.Users where id = ${friend.friend};`
    realFriends.push(idAndName[0])
  }
  res.json(realFriends);
})

app.delete('/try', async(req, res) => {
  const theDeletedFile = await sql`delete from feedback.Message where message_id = ${req.body.id} returning file;`
  const retireFiles = await sql`select file from feedback.Message where room = ${req.body.room};`
  let files = []
  for (const file of retireFiles){
    files.push(file.file)
  }
  if (!files.includes(theDeletedFile[0].file)){
    fs.unlink('./public/image/chat/' + theDeletedFile[0].file, (err) => {
      if (err) {
        console.log(err)
      }
      res.json(true)
    })
  }else{
    res.json(true)
  }
})

app.post('/messages', async(req, res) => {
  const messages = await sql`select message_id, file, link, text, time, type, room, id, img, name 
  from feedback.Message where room = ${req.body.room};`
  console.log(req.body.room)
  res.json(messages)
})

app.post('/message',uploadFile.single('n_file'), async(req, res) => {
  let { msg, user, room } = JSON.parse(req.body.user)
  let file = (req.file) ? req.file.originalname : ''; 
  try{
  const saveMsg = await sql`
          insert into feedback.Message (file, link, text, time, type, room, id, img, name)
          values
          (${msg.file},
           ${msg.link},
           ${msg.text},
           ${msg.time},
           ${msg.type},
           ${JSON.parse(room)},
           ${user.id},
           ${user.img},
           ${user.name})
           returning message_id;`
           res.json(saveMsg)
    }catch(err){
      console.log(err)
    }
}) 

app.post('/sendNotif', async(req, res) => {
  if (req.body.friends){
    for (const user of req.body.friends){
      const saveIt = await sql`insert into feedback.Notifs (id, text, friendRequest) values (${user}, ${req.body.id}, ${req.body.friendRequest});`
      console.log(saveIt)
    }
    res.json(true)
  }
})

app.post('/friends', async(req, res) => {
  const Users = await sql`select * from feedback.Users where id != ${req.body.id};`
  const Notifs = await sql`select id, text from feedback.Notifs where id = ${req.body.id} and friendRequest = 'true';`
  const SecondNotifs = await sql`select id, text from feedback.Notifs where text = ${req.body.id} and friendRequest = 'true';`
  const Friends = await sql`select id, friend from feedback.Friends where id = ${req.body.id};`
  //console.log(Users,Notifs,SecondNotifs, Friends)

  let users1 = []// who send me notif
  for (const notif of Notifs){
      users1.push(notif.text) 
  }
  let IsendTo = []// To who I send notif
  for  (const notif of SecondNotifs){
    IsendTo.push(notif.id)
  }
  let friends = []
  for (const user of Friends){
      friends.push(user.friend) 
  }
  const users3 = Users.filter(user => {
    return !friends.includes(user.id)
  })
  res.json({
    whoSend: users1,
    toWho: IsendTo,
    notFriends: users3
  })
})

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    wss.clients.forEach(async function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        
        const letter = JSON.parse(data);
        client.send(JSON.stringify(letter));
        console.log(letter);
    }})
  })
})

server.listen(port, function() {
  console.log(`Server is listening on ${port}!`)
})