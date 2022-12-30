const express = require('express');
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// console.log(stripe)

//middle ware
app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
    res.send('Hello World!')
  })

  
  const jwtVerify = (req, res, next)=>{
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized access!')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbiden access'})
        }
        req.decoded = decoded;
        next();
    })
  }

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.epqkzkd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){

    try {

        const allProductsCollection = client.db("Redux-projects").collection("AllProducts");
        const myOrdersCollection = client.db("Redux-projects").collection("MyOrders");
        const usersCollection = client.db("Redux-projects").collection("users");

        app.post('/users', async(req, res)=>{
            const body = req.body;
            const users = await usersCollection.insertOne(body);
            res.send(users)
        })
        app.get('/users', async(req, res)=>{
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users)
        })


        // admin 
        app.get('/user/admin/:email', async(req, res)=>{
            const email = req.params.email;
            console.log(email)
            const query = {userEmail: email};
            const user = await usersCollection.findOne(query);
            res.send({isAdmin: user?.role})

        })



        app.get('/allProducts', async(req, res)=>{
            const query = {};
            const products = await allProductsCollection.find(query).toArray();
            res.send(products)
        })


        app.get('/product/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const product = await allProductsCollection.findOne(query);
            res.send(product)
        })


        app.post('/myOrders', async(req, res)=>{
            const orderItems = req.body;
            const result = await myOrdersCollection.insertOne(orderItems);
            res.send(result);

        })
        
        app.get('/myOrders/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const order = await myOrdersCollection.findOne(query);
            res.send(order)
        })

        app.delete('/myOrders/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const ordersProdct = await myOrdersCollection.deleteOne(query);
            res.send(ordersProdct);
        })

        app.get('/myOrders', jwtVerify, async(req, res)=>{
            const email = req.query.email;
          const decodedEmail = req.decoded.email;
          if(email !== decodedEmail){
            return res.status(403).send({message: 'unauthorizize access'})
          }
            console.log("email",email, decodedEmail)
            const query = {buyerEmail: email};
            const myOrders = await myOrdersCollection.find(query).toArray();
            res.send(myOrders);
        })

        //pay put method

        app.post('/myOrdersPay', async(req, res)=>{
            const {id, idd} = req.body;
            console.log(`id=${id} , idd=${idd}`)
            const filter = {_id: ObjectId(id)}
            const filte2 = {_id: ObjectId(idd)}

            const options = {upsert: true}
            const updateDoc = {
                $set:{
                    paid: true
                }
            }

            const result = await myOrdersCollection.updateOne(filter, updateDoc, options)
            const result2 = await allProductsCollection.updateOne(filte2, updateDoc, options)
            res.send(result);

        })





        // //payment section
        // app.post("/create-payment-intent", async (req, res) => {
        //     const orders = req.body;
        //     const price = orders.productPrice;
        //     const amount = price * 100;
        //     const paymentIntent = await stripe.paymentIntents.create({
        //       amount: amount,
        //       currency: "usd",
        //       "payment_method_types": [
        //         "card"
        //     ],
        //     });
          
        //     res.send({
        //       clientSecret: paymentIntent.client_secret,
        //     });
        //   });



        //JWT token
        app.get('/jwt', async(req, res)=>{
            const email = req.query.email;
            const query = {userEmail: email};
            const user = await usersCollection.findOne(query);
            // console.log(user, email)
            if(user){
                const token = jwt.sign({email}, process.env.JWT_TOKEN, {expiresIn: '1h'})
                return res.send({sendToken: token})
            }
            res.status(403).send({jwttoken: ''})

        })



    } catch (error) {
        console.log(error.name, error.message)
        
    }


}
run().catch(console.log)



  app.listen(port, () => {
    console.log(`running on port ${port}`)
  })


