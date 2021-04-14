

    const sendBtn = document.querySelector('#send');
    const messages = document.querySelector('#messages');
    const messageBox = document.querySelector('#messageBox');
    const fileImg = document.querySelector('#fileImg');
    const deleteBTN = document.querySelector('#tryIT');
    let id = null
    let nickname = '';
    let img = '';
    let room = null;
    let ws;
    let Room;
    let nazdar;
        if (window.location.pathname !== '/'){
            nazdar = window.location.pathname.split('').filter(ch => {
            return Number(ch) !== NaN
        }).reduce((a,b) => {
            return a + b
        })
        console.log(nazdar)
    }

    async function getMessages (room){
      const response1 = await fetch('./messages', {
        method: 'POST',
        headers: {
          "Content-type": "application/json"
        },
        body: JSON.stringify({
          room: room
        })
      })
      const messages = await response1.json()
      if (messages.length !== 0){
        for (const msg of messages){
          let message = {
            msg: {
              id: msg.message_id,
              file: msg.file,
              link: msg.link,
              text: msg.text,
              time: new Date(msg.time),
              type: msg.type
            },
            user: {
              id: msg.id,
              img: msg.img,
              name: msg.name
            },
            room: msg.room
          }
          showMessage(message)
        }
        messages.scrollTop = messages.scrollHeight;
      }else{
        console.log(messages)
      }
    }

    async function getUser() {
      let id1 = window.sessionStorage.userId
      let symbol = window.sessionStorage.symbol
      const response1 = await fetch('./users', {
        method: 'POST',
        headers: {
          "Content-type": "application/json"
        },
        body: JSON.stringify({
          id: (id1 === undefined) ? null : id1,
          symbol: symbol
        })
      })
      const data1 = await response1.json();
      console.log(data1)
      if (data1.id !== null){
      id = data1.id
      nickname = data1.nickname
      img = data1.photo
      room = data1.room
      Room = data1.wholeRoom
      getMessages(room)
      roomDetails(Room)
      console.log(data1)
      }else{
        window.history.back()
      }
    }

    const getLeftUsers = async() => {
      let roomUsers = []
      for (const user of Room.users){
        roomUsers.push(user.id)
      }
      const response =  await fetch('./leftUsers', {
          method: 'POST',
          headers: {
              "Content-type": "application/json"
          },
          body: JSON.stringify({
              id: id,
              roomUsers: roomUsers
          })
      })
      const leftUsers = await response.json()
      console.log(leftUsers)
      const ul = document.querySelector('#leftUsers')
      ul.style.display = 'none'
      ul.innerHTML = ''
      for (const user of leftUsers){
          const li = document.createElement('li')
          li.innerHTML = `<input type="checkbox" id="usd" name=${user.nickname} value="${user.id}">
              <img src=/image/profile/${user.photo} width=40 height=40 /><br>${user.nickname}`
          ul.append(li)
      }
  }

  const openLeftUsers = () => {
    const ul = document.querySelector('#leftUsers')
    const button = document.querySelector('#addBtn')
    if (ul.style.display === 'none'){
        ul.style.display = 'block'
        button.style.display = 'block'
    }else{
        ul.style.display = 'none'
        button.style.display = 'none'
    }
}

const addUsers = async() => {
  const leftUsers = document.querySelectorAll('#usd')
  let newRoomUsers = []
  for (let i = 0; i < leftUsers.length; i++){
      if (leftUsers[i].checked === true){
        newRoomUsers.push(JSON.parse(leftUsers[i].value))
      }
  }
  const response = await fetch('./addUsers', {
      method: 'PUT',
      headers: {
          "Content-type": "application/json"
      },
      body: JSON.stringify({
          room: Room,
          users: newRoomUsers,
          admin: id
      })
  }) 
  const answer = await response.json()
  Room = answer
  roomDetails(answer)
  if (!ws) {
      console.log("No WebSocket connection :(");
  }else{
      ws.send(JSON.stringify({
      room: answer,
      users: newRoomUsers,
      whoAdd: nickname
  }))
  }
  console.log(answer)
}

    const dropUser = async(room, userID) => {
      const response = await fetch('./dropUser', {
              method: 'PUT',
              headers: {
                  "Content-type": "application/json"
              },
              body: JSON.stringify({
                  room: room,
                  userID: userID,
                  id: id
              })
          })
          const answer = await response.json()
          console.log(answer)
          Room = answer
          roomDetails(answer)
          if (!ws) {
              console.log("No WebSocket connection :(");
          }else{
              ws.send(JSON.stringify({
              room: answer,
              user: userID,
              whoDropMe: room.admin.nickname
          }))
          }
      }

    getUser()

    function roomDetails (room) {
      const title = document.querySelector('#roomName')
      const usersBox = document.querySelector('#roomUsers')
      title.textContent = room.room
      usersBox.innerHTML = ''
      if (room.users !== 'everybody'){
        for (const user of room.users){
          const li = document.createElement('li')
          const button = document.createElement('button')
          button.textContent = 'Drop user'
          let html = (user.id !== id && user.id !== room.admin.id) ? `<img id=${user.id}img src="/image/profile/${user.photo}" width="30" height="30"><br><span id=${user.id}>${user.nickname}<span>` :
          (user.id !== id && user.id === room.admin.id) ? `<img id=${user.id}img src="/image/profile/${user.photo}" width="30" height="30" ><br><span id=${user.id}>${user.nickname} is Admin<span>` : 
          (user.id === id && user.id !== room.admin.id) ? `<img id=${user.id}img src="/image/profile/${user.photo}" width="30" height="30"><br><span id=${user.id}>You<span>` :
           `<img id=${user.id}img src="/image/profile/${user.photo}" width="30" height="30"><br><span id=${user.id}>You are Admin<span>`
          li.innerHTML = `
          ${html}
          `
          li.className = 'theUser'
          if (room.admin.id === id && user.id !== id){
            button.onclick = () => {
              dropUser(room, user.id)
              //console.log(room, user.id)
            }
            li.append(button)
          }
          usersBox.append(li)
        }
        if (room.admin.id === id){
          document.querySelector('#addImg').style.display = 'block'
        }
        getLeftUsers()
      }else{
        const li = document.createElement('li')
        li.textContent = room.users
        usersBox.append(li)
      }
      
    }
    
    function urlify(text) {
      var urlRegex = /(https?:\/\/[^\s]+)/g;
      return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
      })
    }
    
    var text = 'Find me at http://www.example.com and also at http://stackoverflow.com';
    var html = urlify(text);
    
    console.log(html)

    console.log(window.location);

    

    function showMessage(message) {
      let fileType = (message.msg.type.includes('image/')) ? `<a href="./image/chat/${message.msg.file}" target="_blank"><img src="./image/chat/${message.msg.file}" onload=imageSize(this) /><a/>` : 
      (message.msg.type.includes('application/pdf')) ? `<a href="./image/chat/${message.msg.file}" target="_blank" download>Download file<a/><br><embed src="./image/chat/${message.msg.file}" style=" width: 50%; height: 50%" />` :
       `<a href="./image/chat/${message.msg.file}" target="_blank" download>Download file<a/><br><embed src="./image/chat/${message.msg.file}" style=" background: #BBE2FC; width: 50%; height: 50%; box-shadow: inset 4px 4px 4px 4px rgba(0, 0, 0, 0.2);" />`
       let deleteMsg = (message.user.id === id) ? `<button id="${message.msg.id}" onclick=deleteMessage(this)>TRY DELETE</button>` : ``
      if (message.msg.file !== ''){
        messages.innerHTML += `<div class="messageForeign" style="padding: 10px; width: 85vh;  border-bottom: solid 2px #ECEFF1">
      <img src="/image/profile/${message.user.img}" height="50" width="50" style=" border-radius: 50% "/><br><p>${message.user.name}</p><br><span><p>${urlify(message.msg.text)}</p>${fileType}<span/>${deleteMsg}
      </div><br>`;
      messages.scrollTop = messages.scrollHeight;
      messageBox.value = '';
      return;
      }
      messages.innerHTML += `<div class="messageForeign" style="padding: 10px; width: 85vh;  border-bottom: solid 2px #ECEFF1">
      <img src="/image/profile/${message.user.img}" height="50" width="50" style=" border-radius: 50% "/><br><p>${message.user.name}</p><br><span>${urlify(message.msg.text)}<span/>${deleteMsg}
      </div><br>`;
      messages.scrollTop = messages.scrollHeight;
      messageBox.value = '';
    }

    

    function showText(obj) {
      let fileType = (obj.file.includes('image/')) ? `<a href="${imageLink}" target="_blank"><img src="./image/chat/${imageCode}" onload=imageSize(this) /><a/>` : 
      (obj.file.includes('application/pdf')) ? `<a href="${imageCode}" target="_blank" download>Download file<a/><br><embed src="./image/chat/${imageCode}" style=" width: 50%; height: 50%" />` :
       `<a href="${imageCode}" target="_blank" download>Download file<a/><br><embed src="./image/chat/${imageCode}" style=" width: 50%; height: 50%; box-shadow: inset 4px 4px 4px 4px rgba(0, 0, 0, 0.2);" />`
      if (imageCode !== ''){
        messages.innerHTML += `<div class="messageLine" style="padding: 10px; width: 85vh;  border-bottom: solid 2px #ECEFF1" >
      <img src="image/profile/${img}" height="50" width="50" style=" border-radius: 50% "/><br><p>${nickname}</p><br><span><p>${urlify(obj.text)}</p>${fileType}<span/>
      <button id="${obj.id}" onclick=deleteMessage(this)>TRY DELETE</button>
      </div><br>`;
      messages.scrollTop = messages.scrollHeight;
      messageBox.value = '';
      return;
      }
      messages.innerHTML += `<div class="messageLine"style="padding: 10px; width: 85vh;  border-bottom: solid 2px #ECEFF1" >
      <img src="image/profile/${img}" height="50" width="50" style=" border-radius: 50% "/><br><p>${nickname}</p><br><span>${urlify(obj.text)}<span/>
      <button id="${obj.id}" onclick=deleteMessage(this)>TRY DELETE</button>
      </div><br>`;
      messages.scrollTop = messages.scrollHeight;
      messageBox.value = '';
    }

    function init() {
      if (ws) {
        ws.onerror = ws.onopen = ws.onclose = null;
        ws.close();
      }

      ws = new WebSocket('ws://localhost:3000');
      ws.onopen = () => {
        console.log('Connection opened!');
      }
      ws.onmessage = ({data}) => { 
        let mess = JSON.parse(data);
        if (mess.room === room && mess.user.id !== id){
          showMessage(mess)
          console.log(JSON.parse(data));
        }else if (mess.d === 'deleted'){
          messages.innerHTML = ''
          getMessages(room)
        }else if (mess.whoDropMe && mess.user === id && mess.room.id === Room.id){ 
          alert(mess.whoDropMe + ' dropped you from room: ' + mess.room);
          window.location.pathname = '/'
        }else if (mess.whoDropMe && mess.room.id === Room.id){ 
          roomDetails(mess.room)
          console.log('Drop message catch')
        }else if (mess.whoAdd && mess.room.id === Room.id){ 
          roomDetails(mess.room)
          console.log('Add message catch')
        }else if (mess.whoLeaveRoom &&
         JSON.stringify(mess.room.users).includes(JSON.stringify({id: id, nickname: nickname, photo: img})) && mess.room.id === Room.id){
          alert(mess.whoLeaveRoom + ' leave room: ' + mess.room.room)
          roomDetails(mess.room)
        }else if (mess.adminName && mess.users.includes(id)){
          alert(mess.adminName + ' deleted room: ' + mess.room)
          window.location.pathname = '/'
      }else{
          console.log('Spatny chat ',JSON.parse(data));
        }
        
    };
      ws.onclose = function() {
        ws = null;
      }
    }
    
    sendBtn.onclick = async function() {
      const input = document.querySelector('#fileInput')
      const formData = new FormData()
      formData.append('user', JSON.stringify({
        msg:{ 
          text: messageBox.value,
          file: (input.files[0]) ? input.files[0].name : '',
          link: (input.files[0]) ? input.files[0].name : '',
          type: (input.files[0]) ? input.files[0].type : '',
          time: new Date()
        },
        user: {
          id: id,
          name: nickname,
          img: img
        },
        room: room
      }))
      formData.append('n_file', input.files[0])
      const response = await fetch('./message',{
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      console.log(data)
      if (!ws) {
        showMessage("No WebSocket connection :(");
        return ;
      }

      ws.send(JSON.stringify({
        msg:{ 
          id: data[0].message_id,
          text: messageBox.value,
          file: (input.files[0]) ? input.files[0].name : '',
          link: (input.files[0]) ? input.files[0].name : '',
          type: (input.files[0]) ? input.files[0].type : '',
          time: new Date()
        },
        user: {
          id: id,
          name: nickname,
          img: img
        },
        room: room
      }));
     
      showText({ text: messageBox.value, file: type, id: data[0].message_id });
      const fileInput = document.querySelector('#fileInput')
      fileInput.value = ''
      imageCode = ''
      messages.scrollTop = messages.scrollHeight;
      const helper = document.querySelector('#helper')
      helper.href = ''
      helper.textContent = ''
    }

    fileImg.onclick = () => {
     document.querySelector('#fileInput').click()
    }

   

  init();

  let imageLink = '';
  let imageCode = '';
  let type = '';

async function deleteMessage (elem){
    const response = await fetch('./try', {
      method: 'DELETE',
      headers: {
        "Content-type": "application/json"
      },
      body: JSON.stringify({
        id: JSON.parse(elem.id),
        room: room
      })
    })
    if (!ws) {
      showMessage("No WebSocket connection :(");
      return ;
    }

    ws.send(JSON.stringify({
      d: 'deleted'
    }))
    messages.innerHTML = ''
    getMessages(room)
  }

  function imageSize(img) {
    if (img.id !== 'true'){
    img.id = 'true'
    let originalWidth = img.clientWidth
    let originalHeight = img.clientHeight
    img.width = originalWidth * 0.3
    img.height = originalHeight * 0.3
    }
    console.log('image size called ', img )
    console.log('image size called ', img )
}

  function readFile(input) {
    input.files[0].size = input.files[0].size * 0.3
    let file = input.files[0];
    let reader = new FileReader();
      let link =  URL.createObjectURL(file)
      imageLink = link
      const helper = document.querySelector('#helper')
      helper.href = link
      helper.textContent = file.name
      helper.style.display = 'block'
      imageCode = file.name
    reader.readAsDataURL(file);
    reader.onload = function() {
      type = reader.result
      //imageCode = reader.result
    };

    reader.onerror = function() {
      console.log(reader.error);
    };
  
  }
  
 

