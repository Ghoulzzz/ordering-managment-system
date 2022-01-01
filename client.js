// Function that sends information to the server to validate if the login creditials are correct
// If it is a valid user/password they will be logged in, otherwise they cannot login!
function loginCheck() {
    var http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
        }
    };
    http.open('POST', 'http://localhost:3000/verifyLogin', true);
    http.setRequestHeader("Content-Type", "application/json");
    http.send(JSON.stringify({"username": document.getElementById("username").value, "password": document.getElementById("password").value}));
}

// Function that sends the user/password to the server to check if the username is already taken
// If the username is not already taken then it will add them to the database, otherwise they are told the username already exists!
function registerCheck() {
    var http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        console.log(http.status);
        if (http.readyState == 4 && http.status == 409) {
            alert("Username is already taken!")
        } 
    };
    http.open('POST', 'http://localhost:3000/verifyRegister', true);
    http.setRequestHeader("Content-Type", "application/json");
    http.send(JSON.stringify({"username": document.getElementById("username2").value, "password": document.getElementById("password2").value}));
}

// Function that changes the users privacy, sends the server either a 1 OR 0, depending on the privacy they want
// Changes privacy setting
function changePrivacy() {
    var http = new XMLHttpRequest();
    let elem = document.getElementsByName("privacy");
    let newPrivacy;

    for (let i = 0;i < elem.length;i++) {
        if (elem[i].checked) {
            newPrivacy = elem[i].value;
        }
    }

    http.onreadystatechange = function () {
        if (http.readyState == 4) {
            if (http.status == 200) {
                alert("Sucessfully changed!");
            } 
        }
    };
    http.open('POST', 'http://localhost:3000/changePrivacy', true);
    http.setRequestHeader("Content-Type", "application/json");
    http.send(JSON.stringify({"privacy": newPrivacy}));
}