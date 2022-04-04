function validateForm () {
    //console.log("Form enviado")
    //alert("hola")
    let x = document.forms["formulari"]["name"].value;
    let y = document.forms["formulari"]["email"].value;
    let z = document.forms["formulari"]["password"].value;
    let f = document.forms["formulari"]["password2"].value;
    if ( x == "") {
        alert("Nombre requerido!!")
        return false
    }
    else if ( y == "") {
        alert("Email requerido!!")
        return false
    }
    else if ( z == "" ) {
        alert("Contraseña requerida!!")
        return false
    }
    else if (z != f) {
        alert("Las contraseñas no coinciden!!")
        return false
    }
    else {
        return true
    }
}
//function validateForm() {
//    if ( x =! "" && y != "" && z != "") {
//        return true
//    }
//    else {
//        alert("Rellena todos los campos")
//        return false
//    }
//}