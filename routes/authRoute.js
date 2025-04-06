const express=require('express')
const cors=require('cors')
const { connectToDatabase } = require('../lib/db');
const bcrypt=require('bcrypt')
const router=express.Router();
const app=express()
app.use(cors())
app.use(express.json())

router.post('/register',async (req,res)=>{
const {username,email,password}=req.body;
console.log(req.body)
try{
    const bd = await connectToDatabase(); 
    const [rows]=await bd.query('select * from user where name= ?',[username],(err,data)=>{
        if(err){
           return console.log(err)
        }
    })
    if(rows.length>0){
        return res.status(409).json({message:"the user already existed !"})
    }
    const hashPass=await bcrypt.hash(password,10)
    await bd.query('insert into user (name,email,password) values (?,?,?)',[username,email,hashPass],(err,data)=>{
        if(err)  {return res.status(500).send("error"+err);}
        
        return  res.status(201).send("user created succesfully !")
    })

 
}catch(e){
    console.error("Error in register route:", e);
    return res.status(500).send("Server error");
}
})

module.exports = router; 