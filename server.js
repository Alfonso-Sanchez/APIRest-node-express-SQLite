// Create express app
var express = require("express");
var app = express();
var db = require("./database.js");
var bodyParser = require("body-parser");
var md5 = require('md5');
var fs = require("fs");
var https = require("https");
var jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { url } = require("inspector");
const exphbs = require('express-handlebars')

// Support URL-Encoded bodies
app.use(bodyParser.urlencoded({ extended: true}));
// parse cookies from HTTP Request
app.use(cookieParser())
// change handlebars extension
app.engine('hbs', exphbs.engine({
    extname: '.hbs'
}));
app.set('view engine', 'hbs')
//get config vars
dotenv.config();
// access config var
process.env.TOKEN_SECRET;
//Generar un token
function GenerateAccessToken(email){
    return jwt.sign(email, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
}
//middleware NO TRANSPARENTE
const rutasProtegidas = express.Router(); 
rutasProtegidas.use((req, res, next) => {
    const token = req.body.token;
 
    if (token) {
      jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {      
        if (err) {
          return res.json({ mensaje: 'Token inválida' });    
        } else {
          req.decoded = decoded;    
          next();
        }
      });
    } else {
      res.send({ 
          mensaje: 'Token no proveída' 
      });
    }
 });
const rutasProtegidas_transparente = express.Router();
 rutasProtegidas_transparente.use((req, res, next) => {
     const token = req.cookies.access_token;
     if (!token) {
        return res.redirect(301, "https://localhost/login_transparente.html");
     }
     else {
         jwt.verify(token,process.env.TOKEN_SECRET, (err,decoded) => {
            if (err) {
                res.send({Mensaje: "Error de token"})
            }
            else {
                req.decoded = decoded;
                next();
            }
         })
     }
 })
// Middleware template
const rutasProtegidas_template = express.Router();
 rutasProtegidas_template.use((req, res, next) => {
     const token = req.cookies.access_token;
     if (!token) {
        res.render('login', {
            message: 'Inicie sesion antes de entrar',
            messageClass: 'alert-danger'
        });
     }
     else {
         jwt.verify(token,process.env.TOKEN_SECRET, (err,decoded) => {
            if (err) {
                res.render('login')
            }
            else {
                req.decoded = decoded;
                next();
            }
         })
     }
 })
// Start server HTTPS
https
  .createServer(
    {
      key: fs.readFileSync("certificado/server.key"),
      cert: fs.readFileSync("certificado/server.cert"),
    },
    app
  )
  .listen(6700, function () {
    console.log(
      "Web https://localhost:6700/"
    );
  });
//
// LOGIN COOKIE CON TEMPLATES
//

// Root endpoint
app.get("/", function (req, res, next) {
    /* res.json({"message":"Ok"}) */
    res.render('home.hbs')
});

// Register
app.get('/template/register', (req, res) => {
    res.render('register');
});

// Pagina de login
app.get('/template/login', (req, res) => {
    res.render('login');
});
// Pagina protegida 
app.get('/template/protected', rutasProtegidas_template, (req, res) => {
    res.render('protected');
});

// Insertar usuarios
app.post("/template/register", (req, res) => {
    if (req.body.name == ''){
        res.render('register', {
            message: 'No se ha especificado un nombre',
            messageClass: 'alert-danger'
        });
    } else if (req.body.email == ''){
        res.render('register', {
            message: 'No se ha especificado correo electronico',
            messageClass: 'alert-danger'
        });
    } else if (req.body.password != req.body.passwordc){
        res.render('register', {
            message: 'Las contraseñas no coinciden',
            messageClass: 'alert-danger'
        });
    } else {
        var data = {
            name: req.body.name,
            email: req.body.email,
            password : req.body.password,
        }
        var sql ='INSERT INTO user (name, email, password) VALUES (?,?,?)'
        var params =[data.name, data.email, md5(data.password)]
        db.run(sql, params, function (err, result) {
          /*   if (err){
                res.status(400).json({"error": err.message})
                return;
            } */
            if (err) {
                res.render('register', {
                    message: 'Se ha producido un error'+' '+err.message,
                    messageClass: 'alert-danger'
                });
            } else {
                res.render('login', {
                    message: 'Se ha completado el registro. Porfavor, entre para continuar',
                    messageClass: 'alert-success'
                });
            }
        });
    }
}); 

// Login usuarios
app.post("/template/login", (req, res, next) => {
    var errors=[]
    if (req.body.email == ''){
        res.render('login', {
            message: 'No se ha especificado un correo',
            messageClass: 'alert-danger'
        });
    } else if (req.body.password == ''){
        res.render('login', {
            message: 'No se ha especificado una contraseña',
            messageClass: 'alert-danger'
        });
    } else {
     //Coger datos HTML
   var email = req.body.email
   var password = md5(req.body.password)
    //Comprobar que los datos del cliente existen en la base de datos.
        db.all('SELECT email,password FROM user where email="'+email+'" and password="'+password+'"',(err,data)=>{
            if(data.length==1){
                const token = GenerateAccessToken({email: req.body.email});
                return res
                    .cookie("access_token", token, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                    })
                    .status(200)
                    .render('protected')
            } else {
                res.render('login', {
                    message: 'Usuario y contraseña incorrectos o inexistentes',
                    messageClass: 'alert-danger'
                }); 
        return;
    }
    }); 
}});

app.get("/template/logout", rutasProtegidas_template, (req, res) => {
    res
      .clearCookie("access_token")
      .status(200)
      .render('home')
  });
// Insert here other API endpoints
app.get("/api/users", (req, res, next) => {
    var sql = "select * from user"
    db.all(sql, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
});

app.get("/api/user/:id", (req, res, next) => {
    var sql = "select * from user where id = " + req.params.id
    db.get(sql, (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
        }else{
            res.json({
                "message":"success",
                "data":row
            })
        }
      });
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.post("/api/user/", (req, res, next) => {
    var errors=[]
    if (!req.body.password){
        errors.push("No password specified");
    }
    if (!req.body.email){
        errors.push("No email specified");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    var data = {
        name: req.body.name,
        email: req.body.email,
        password : req.body.password
    }
    var sql ='INSERT INTO user (name, email, password) VALUES (?,?,?)'
    var params =[data.name, data.email, md5(data.password)]
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({
            "message": "success",
            "data": data,
            "id" : this.lastID
        })
    
    });
});
// LOGIN COOKIE NO TRANSPARENTE
app.post("/api/user/login", (req, res, next) => {
    var errors=[]
    if (!req.body.password){
        errors.push("No password specified");
    }
    if (!req.body.email){
        errors.push("No email specified");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    //Coger datos HTML
   var email = req.body.email
   var password = md5(req.body.password)
    
    //Comprobar que los datos del cliente existen en la base de datos.
    if(email != '' && password != '') {
        db.all('SELECT email,password FROM user where email="'+email+'" and password="'+password+'"',(err,data)=>{
            if(data.length==1){
                const token = GenerateAccessToken({email: req.body.email});
                return res.send({
                                message: "success",
                                token: token,
                                accede_a_tus_datos: "Accede usando el token indicado! > https://localhost/datos.html"
                                })
            }
    else {
    //res.send permite mandar codigo HTML5.
        res.send({
                message: "Error, usuario y contraseña incorrecto!"
                })
        return;
    }

    });
    };
});
app.post("/api/user/datos", rutasProtegidas, (req,res) => {
    const datos = [
     { id: 1, nombre: "Daryl" },
     { id: 2, nombre: "Alfonso" },
     { id: 3, nombre: "Jaime" }
    ];
    res.json(datos);
});

// LOGIN COOKIE TRANSPARENTE
app.post("/api/user/cookie_transparente", (req, res, next) => {
    var errors=[]
    if (!req.body.password){
        errors.push("No password specified");
    }
    if (!req.body.email){
        errors.push("No email specified");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    //Coger datos HTML
   var email = req.body.email
   var password = md5(req.body.password)
    
    //Comprobar que los datos del cliente existen en la base de datos.
    if(email != '' && password != '') {
        db.all('SELECT email,password FROM user where email="'+email+'" and password="'+password+'"',(err,data)=>{
            if(data.length==1){
                const token = GenerateAccessToken({email: req.body.email});
                return res
                    .cookie("access_token", token, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                    })
                    .status(200)
                    .json({
                        message: "Logged in successfully",
                        datos: "https://localhost:6700/api/cookie/datos_transparente",
                        logout: "https://localhost:6700/api/cookie/logout"
                    })
            }
    else {
    //res.send permite mandar codigo HTML5.
        res.send({
                message: "Error, usuario y contraseña incorrecto!"
                })
        return;
    }
    });
    }});

app.get("/api/cookie/datos_transparente", rutasProtegidas_transparente, (req,res) => {
    const datos = [
     { id: 1, nombre: "Daryl" },
     { id: 2, nombre: "Alfonso" },
     { id: 3, nombre: "Jaime" }
    ];
    res.json(datos);
});

app.get("/api/cookie/logout", rutasProtegidas_transparente, (req, res) => {
    res
      .clearCookie("access_token")
      .status(200)
      .send({Message: "Loged out > login page https://localhost/login_transparente.html"})
  });

app.patch("/api/user/:id", (req, res, next) => {
    var data = {
        name: req.body.name,
        email: req.body.email,
        password : req.body.password ? md5(req.body.password) : null
    }
    db.run(
        `UPDATE user set 
           name = COALESCE(?,name), 
           email = COALESCE(?,email), 
           password = COALESCE(?,password) 
           WHERE id = ?`,
        [data.name, data.email, data.password, req.params.id],
        function (err, result) {
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({
                message: "success",
                data: data,
                changes: this.changes
            })
    });
})
app.delete("/api/user/:id", (req, res, next) => {
    db.run(
        `DELETE FROM user WHERE id = ?`,
        [req.params.id],
        function (err, result) {
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({
                message: "success",
            })
    });
})

// Default response for any other request
// Default response for any other request
app.use(function (req, res) {
    res.status(404).json({ "error": "Invalid endpoint" });
    });
