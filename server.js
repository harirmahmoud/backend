const express=require("express")
const cors=require("cors")
const mysql=require('mysql2')
const app=express()
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
app.use(cors())
app.use(express.json())
const db=mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"library"
})
app.get('/',(req,res)=>{
    const sql='select * from user '
    db.query(sql,(err,data)=>{
        if(err) return res.status(500).send(err);
        return res.status(200).json(data)
    })
})

app.post('/create',(req,res)=>{
    const values=[
        req.body.name,
        req.body.email,
        req.body.phone
    ]
    console.log(values)
    const sql='insert into user (name,email,phone) values(?)'
    db.query(sql,[values],(err,data)=>{
        if(err) return res.status(500).send(err);
        return res.status(200).send("created succesfully !!")
    })
})

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
       const token=jwt.sign({id: data[0].name},'private',{expiresIn:'3h'})
       return res.status(201).json({token:token})
    });
});

app.put('/update/:id',(req,res)=>{
    const values=[
        req.body.name,
        req.body.email,
        req.body.phone
    ]
    console.log(values)
    const id=req.params.id
    const sql='update user set name=?,email=?,phone=? where id=?'
    db.query(sql,[...values,id],(err,data)=>{
        if(err) return res.status(500).send("error"+err);
        return res.status(200).send("updated succesfully !!")
    })
})

app.delete('/delete/:id',(req,res)=>{
    
    const id=req.params.id
    const sql='delete from user where id=?'
    db.query(sql,[id],(err,data)=>{
        if(err) return res.status(500).send("error"+err);
        return res.status(200).send("deleted succesfully !!")
    })
})

const verifyToken=async(req,res,next)=>{
    try{
        const token=req.headers['authorization'].split(' ')[1];
        if(!token){
            return res.status(403).json({message:"No token provided !!"})
        }
        const decoder=jwt.verify(token,'private')
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