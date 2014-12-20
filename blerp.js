jade = require('jade'); 
var books = ['a','b','c'];
jade.render("ul\n  each book in books\n    il= book",{books: books})