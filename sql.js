const express=require("express")
const cors=require("cors")
const mysql=require('mysql2')
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
const dotenv=require('dotenv')
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const upload = multer({ dest: "uploads/" });
dotenv.config()
const app=express()
app.use(cors())
app.use(express.json())
const db=mysql.createConnection({
  host: process.env.VITE_LOCAL,
  user: process.env.VITE_USER,
  password: process.env.VITE_PASSWORD,
  database: process.env.VITE_DATABASE
})
app.get('/',(req,res)=>{
    res.send("hello")
})

app.use(express.json());

app.post('/book', (req, res) => {
  const { subject, search } = req.body;

  const searchParam = `%${search}%`;

  const sqlBooks = subject === "all"
    ? `SELECT * FROM book WHERE title LIKE ?`
    : `SELECT * FROM book WHERE title LIKE ? AND category LIKE ?`;

  const bookParams = subject === "all"
    ? [searchParam]
    : [searchParam, `%${subject}%`];

  db.query(sqlBooks, bookParams, async (err, bookResults) => {
    if (err) {
   
      return res.status(500).send("Error fetching books");
    }

    try {
     
      const booksWithAuthors = await Promise.all(
        bookResults.map(book => {
          return new Promise((resolve, reject) => {
            const sqlAuthor = `SELECT * FROM author WHERE id_book = ?`;
            db.query(sqlAuthor, [book.id_book], (err2, authorResults) => {
              if (err2) return reject(err2);
              book.authors = authorResults; 
              resolve(book);
            });
          });
        })
      );

      return res.status(200).json({ books: booksWithAuthors });

    } catch (err2) {
      console.error(err2);
      return res.status(500).send("Error fetching authors");
    }
  });
});



app.get('/auth', (req, res) => {
  const { search, subject } = req.query;
  const searchParam = `%${search}%`;

  const sqlAuthors = `SELECT * FROM author WHERE name LIKE ?`;

  db.query(sqlAuthors, [searchParam], async (err, authors) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error fetching authors");
    }

    try {
      const uniqueBookIds = [...new Set(authors.map(author => author.id_book))];

      const booksWithAuthors = await Promise.all(
        uniqueBookIds.map(bookId => {
          return new Promise((resolve, reject) => {
            const sqlBook =
              subject === "all"
                ? `SELECT * FROM book WHERE id_book = ?`
                : `SELECT * FROM book WHERE id_book = ? AND category LIKE ?`;

            const params = subject === "all" ? [bookId] : [bookId, `%${subject}%`];

            db.query(sqlBook, params, (err2, bookResult) => {
              if (err2) return reject(err2);
              if (bookResult.length === 0) return resolve(null);

              const book = bookResult[0];

              const sqlAuthorsOfBook = `SELECT * FROM author WHERE id_book = ?`;
              db.query(sqlAuthorsOfBook, [book.id_book], (err3, authorsOfBook) => {
                if (err3) return reject(err3);
                book.authors = authorsOfBook;
                resolve(book);
              });
            });
          });
        })
      );

      const filtered = booksWithAuthors.filter(b => b !== null);
      return res.status(200).json({ books: filtered });
    } catch (error) {
      console.error(error);
      return res.status(500).send("Error processing authors and books");
    }
  });
});


  app.get('/bookd/:id', (req, res) => {
    const { id } = req.params;
    console.log(id);
  
    const sqlBook = `SELECT * FROM book WHERE id_book = ?`;
    db.query(sqlBook, [id], (err, results) => {
      if (err) return res.status(500).send('Error fetching book');
  
      if (results.length === 0) {
        return res.status(404).send('Book not found');
      }
  
      const book = results[0]; 
  
      const sqlAuthor = `SELECT * FROM author WHERE id_book = ?`;
      db.query(sqlAuthor, [id], (err2, authors) => {
        if (err2) return res.status(500).send('Error fetching authors');
  
       
        book.authors = authors;
  
        return res.status(200).json(book);
      });
    });
  });
  


app.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    // First query to check if user exists
    db.query('SELECT * FROM user WHERE name = ?', [username], (err, data) => {
        if (err) {
            return res.status(500).send("Error while checking for user: " + err);
        }

        if (data.length > 0) {
            return res.status(409).json({ message: "The user already existed!" });
        }

        // If user doesn't exist, hash the password
        bcrypt.hash(password, 10, (err, hashPass) => {
            if (err) {
                return res.status(500).send("Error while hashing password: " + err);
            }

            // Insert new user into the database with the hashed password
            db.query('INSERT INTO user (name, email, password) VALUES (?, ?, ?)', [username, email, hashPass], (err, result) => {
                if (err) {
                    return res.status(500).send("Error while creating user: " + err);
                }

                // Respond with success
                return res.status(201).send("User created successfully!");
            });
        });
    });
});

app.post('/login', (req, res) => {
    const { username, email, password } = req.body;

    
    db.query('SELECT * FROM user WHERE name = ?', [username],async (err, data) => {
        if (err) {
            return res.status(500).send("Error while checking for user: " + err);
        }

        if (data.length == 0) {
            return res.status(404).json({ message: "The user not existed!" });
        }


       const isMatch=await bcrypt.compare(password,data[0].password)
       if(!isMatch){
        return res.status(401).json({ message: "wrong password !!" });
       }
       const token=jwt.sign({id: data[0].name},process.env.SECRET,{expiresIn:'3h'})
       return res.status(201).json({token:token})
    });
});

app.post('/like',(req,res)=>{
    const {username,book}=req.body
    db.query('insert into saves (id_book,name) values (?,?) ',[book,username],(err,data)=>{
        if (err) {
            return res.status(500).send("Error while saving this book: " + err);
        }
        return res.status(201).send("the book has been saved successfully!");
    })
})

app.post('/delete', (req, res) => {
    const { username, book } = req.body;
    console.log({book,username})
    
    db.query('DELETE FROM saves WHERE id_book = ? AND name = ?', [book, username], (err, data) => {
      if (err) {
        return res.status(500).send("Error: " + err);  
      }else{
        
        return res.status(200).send("Deleted successfully!");
      }
      
    });
  });
  app.post('/deleteall',(req,res)=>{
    const { username } = req.body;
   
    
    db.query('DELETE FROM saves WHERE name = ?', [ username], (err, data) => {
      if (err) {
        return res.status(500).send("Error: " + err);  
      }else{
        
        return res.status(200).send("Deleted successfully!");
      }
      
    });
  })
  app.post('/check', (req, res) => {
    const { username, book } = req.body;
    db.query('SELECT * FROM saves WHERE id_book = ? AND name = ?', [book, username], (err, data) => {
      if (err) {
        console.log(err)
        return res.status(500).send("Error while checking the book: " + err);
      }
      if (data.length === 0) return res.status(404).send("Book not found!");
      else{
       
        return res.status(200).send("The book has already been saved.");
      }
     
    });
  });

  app.post('/checks', (req, res) => {
    const { username } = req.body;
    db.query('SELECT * FROM saves inner join book on saves.id_book=book.id_book WHERE saves.name = ?', [ username], (err, data) => {
      if (err) {
        console.log(err)
        return res.status(500).send("Error while checking the book: " + err);
      }
     
      else{
       
        return res.status(200).send(data);
      }
     
    });
  });

const verifyToken=async(req,res,next)=>{
    try{
        const token=req.headers['authorization'].split(' ')[1];
        if(!token){
            return res.status(403).json({message:"No token provided !!"})
        }
        const decoder=jwt.verify(token,process.env.SECRET)
        req.userId=decoder.id;
        next()
    }catch(err){
        return res.status(500).json({message:"error server !!"})
    }
}

app.get('/home',verifyToken,async (req,res)=>{
    db.query('SELECT * FROM user WHERE name = ?', [req.userId],async (err, data) => {
        if (err) {
            return res.status(500).send("Error while checking for user: " + err);
        }

        if (data.length == 0) {
            return res.status(404).json({ message: "The user not existed!" });
        }
        return res.status(201).json({user:data[0]})})
})




app.listen(3000,()=>{
    console.log("listenning to port 3000 ...")
})