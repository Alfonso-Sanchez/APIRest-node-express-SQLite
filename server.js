// Create express app
var express = require("express")
var app = express()
var db = require("./database.js")
var bodyParser = require("body-parser");
var md5 = require('md5')
var fs = require("fs");
var https = require("https");
// Server port
//var HTTP_PORT = 6700
// Start server
//app.listen(HTTP_PORT, '10.10.10.1'); {
    //console.log("Servidor escoltant a l'adreça http://localhost:%PORT%".replace("%PORT%",HTTP_PORT))
//    console.log("Servidor funcionando http://10.10.10.1:6700")
//}
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
// Root endpoint
app.get("/", (req, res, next) => {
    res.json({"message":"Ok"})
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

// ### DELETE CON REQUISITOS ###

//app.delete("/api/user/", (req, res, next) => {
    // var errors=[]
    // if (!req.body.password){
    //     errors.push("No password specified");
    // }
    // if (!req.body.email){
    //     errors.push("No email specified");
    // }
       // email: req.body.email,
        // if (!req.body.name){
    //     errors.push("No name specified");
    // }
    // if (errors.length){
    //     res.status(400).json({"error":errors.join(",")});
    //     return;
    // }
  //  var data = {
    //    name: req.body.name,
    //    email: req.body.email,
    //    password : req.body.password
    //}
    //var sql ='DELETE FROM user WHERE name = ? AND email = ? AND password = ?'
    //var params =[data.name, data.email, md5(data.password)]
    //db.run(sql, params, function (err, result) {
      //  if (err){
        //    res.status(400).json({"error": err.message})
          //  return;
        //}
        //res.json({
          //  "message": "success",
          //  "data": data,
          //  "id" : this.lastID
       // })
   // });
//});
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