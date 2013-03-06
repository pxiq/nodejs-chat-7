
// We connect to local MySQL instance
var mysql = require('mysql');
var connection = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '',
	database : 'chat',
});

// We load required modules and start the server
var express = require('express');
var app = express();
app.use(express.static(__dirname + '/client'));
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(8080);

// routing
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/client/index.html');
});

connection.connect(function(err){
	if (err) throw err;
});

// usernames which are currently connected to the chat
var usernames = {};

io.sockets.on('connection', function (socket) {

	// We store the remote address here so we can use the IP later on
	var rAddr = socket.handshake.address;

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.emit('updatechat', socket.username, data);
	});

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		// we store the username in the socket session for this client
		socket.username = username;
		// add the client's username to the global list
		usernames[username] = username;
		// echo to client they've connected
		socket.emit('updatechat', 'SERVER', 'you have connected');
		// echo globally (all clients) that a person has connected
		socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');
		// update the list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
	});

	// when the user try to login ... perform this
	socket.on('login', function(username,password) {
		console.log("Login from " + username + "@" + rAddr.address);
		connection.query('SELECT count(*) as cntRows FROM members WHERE username = ' + connection.escape(username) + ' AND password = ' + connection.escape(password) + '', function(err,rows,fields) {
		if(err) throw err;
		
		var cntRows = rows[0].cntRows;
		if(cntRows>0) {
			socket.emit('enterchat',true);
		}

		});
	});


	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
	});
});