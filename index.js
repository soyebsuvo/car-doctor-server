const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// console.log(process.env.DB_USER);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1qnjuxu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// my middleware
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("token in the middleware", token);
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "not authorized" });
    }
    req.user = decoded;
    next();
  });
};
// const logger = async (req , res , next ) => {
//     console.log("called : " , req.host , req.originalUrl);
//     next()
// }

// const verifyToken = ( req , res , next) => {
//   const token = req.cookies?.token;
//   // console.log("from middleware : token is : " , token)
//   if(!token){
//     return res.status(401).send({message : 'not authorized'});
//   }
//   jwt.verify(token , process.env.ACCESS_TOKEN_SECRET , (err , decoded ) => {
//     if(err){
//       return res.status(401).send({message : 'not authorized'});
//     }
//     // console.log("finally find the decoded : " , decoded)
//     req.user = decoded;
//     next();
//   })

// }

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctorDB").collection("services");
    const bookingCollection = client.db("carDoctorDB").collection("bookings");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ message: "success" });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log(user);
      res.clearCookie("token", { maxAge: 0 });
      res.send(user);
    });

    // app.post("/jwt", async (req, res) => {
    //   const user = req.body;
    //   // console.log(user)
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "1h",
    //   });
    //   res.cookie("token", token, {
    //     httpOnly: true,
    //     secure: false,
    //     // sameSite: "none"
    //   });
    //   res.send({ success: true });
    // });

    // service related api
    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    app.get("/bookings", verifyToken, async (req, res) => {
      // console.log("cookkkiiii ", req.cookies.token);
      // console.log("after call : ", req.user);
      // console.log(req.query.email);
      if (req.query?.email !== req.user?.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const order = req.body;
      const result = await bookingCollection.insertOne(order);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updated = req.body;
      console.log(updated);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updated.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car doctor server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port : ${port}`);
});
