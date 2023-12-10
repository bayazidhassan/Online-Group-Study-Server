const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;



//middleware
app.use(cors({
    origin: ['http://localhost:5173', 'https://online-group-study-bayazid.netlify.app'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());





//logger middleware
const logger = async (req, res, next) => {
    console.log('Called: ', req.host, req.url);
    next();
}

//verifyToken middleware
const verifyToken = async (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('Token in middleware: ', token);

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            // console.log(err);
            return res.status(401).send({ message: 'Unauthorized' })
        }
        // console.log('Value in the token: ', decoded);
        req.user = decoded;
        next();
    })
}






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nmlnmya.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();




        //for create database and collections
        const assignmentCollection = client.db('onlineGroupStudyDB').collection('assignments');
        const submittedAssignmentCollection = client.db('onlineGroupStudyDB').collection('submittedAssignments');
        const featureCollection = client.db('onlineGroupStudyDB').collection('feature');



        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log('User for token: ', user);

            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.cookie(
                "token",
                token,
                {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production" ? true : false,
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                    // sameSite: 'none',
                    // secure: true
                }
            )
                .send({ success: true });
        })
        app.post('/logout', async (req, res) => {
            const user = req.body;

            console.log('log out user: ', user);
            res.clearCookie(
                "token",
                {
                    maxAge: 0,
                    // secure: process.env.NODE_ENV === "production" ? true : false,
                    // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                    sameSite: 'none',
                    secure: true
                }
            )
                .send({ success: true })
        })


        // insert a new assignment into assignments collection
        app.post('/createAssignment', async (req, res) => {
            const newAssignment = req.body;

            const result = await assignmentCollection.insertOne(newAssignment);
            res.send(result);
        })






        // pagination
        // read all data to count number of assignments from assignments collection
        app.get('/assignmentsCount', async (req, res) => {
            const count = await assignmentCollection.estimatedDocumentCount(); // return an object
            res.send({ count });
        })
        // read all assignments for a specific difficulty from assignments collection
        app.get('/assignmentsCnt/:difficulty', async (req, res) => {
            const difficulty = req.params.difficulty;
            if (difficulty === 'All') {
                const result = await assignmentCollection.find().toArray();
                res.send(result);
            }
            else {
                const query = { difficulty: difficulty };
                const result = await assignmentCollection.find(query).toArray();
                res.send(result);
            }
        })
        // for pagination
        app.get('/assignments/:difficulty', async (req, res) => {
            const difficulty = req.params.difficulty;

            // console.log('Pagination query: ', req.query);
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);

            if (difficulty === 'All') {
                const result = await assignmentCollection.find().skip(page * size).limit(size).toArray();
                res.send(result);
            }
            else {
                const query = { difficulty: difficulty };
                const result = await assignmentCollection.find(query).skip(page * size).limit(size).toArray();
                res.send(result);
            }
        })









        // delete a assignment from assignments collection
        app.delete('/deleteAssignment/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) }
            const result = await assignmentCollection.deleteOne(query);
            res.send(result);
        })


        // read a single assignment by specific id for update from assignments collection
        app.get('/updateAssignment/:id', logger, verifyToken, async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const result = await assignmentCollection.find(query).toArray();
            res.send(result);
        })


        // update a specific assignment from assignments collection
        app.put('/updateAssignment/:id', async (req, res) => {
            const id = req.params.id;
            const assignment = req.body;

            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };

            const updatedAssignment = {
                $set: {
                    title: assignment.title,
                    photoUrl: assignment.photoUrl,
                    difficulty: assignment.difficulty,
                    marks: assignment.marks,
                    dueDate: assignment.updatedDueDate,
                    description: assignment.description
                }
            }
            const result = await assignmentCollection.updateOne(query, updatedAssignment, options);
            res.send(result);
        })


        // read a single assignment by specific id for details from assignments collection
        app.get('/assignmentDetails/:id', logger, verifyToken, async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const result = await assignmentCollection.find(query).toArray();
            res.send(result);
        })



        // insert a new assignment into submittedAssignments collection
        app.post('/submitAssignment', async (req, res) => {
            const newAssignment = req.body;

            const result = await submittedAssignmentCollection.insertOne(newAssignment);
            res.send(result);
        })



        // read all pending assignments from submittedAssignments collection
        app.get('/pendingAssignments/:pendingStatus', logger, verifyToken, async (req, res) => {
            const status = req.params.pendingStatus;


            const query = { pendingStatus: status };
            const result = await submittedAssignmentCollection.find(query).toArray();
            res.send(result);
        })


        // read all assignments by specific email from submittedAssignments collection
        app.get('/myAssignments', logger, verifyToken, async (req, res) => {
            // const email = req.query.email;


            console.log('Verified token owner info: ', req.user);

            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'Access Forbidden' })
            }

            // const query = { submittedBy: email };

            let query = {};
            if (req.query?.email) {
                query = { submittedBy: req.query.email };
            }

            const result = await submittedAssignmentCollection.find(query).toArray();
            res.send(result);
        })


        // read a single assignment by specific id for mark assignment from submittedAssignments collection
        app.get('/markAssignment/:id', logger, verifyToken, async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const result = await submittedAssignmentCollection.find(query).toArray();
            res.send(result);
        })


        // give mark and change status from submittedAssignments collection
        app.patch('/markAssignment/:id', async (req, res) => {
            const id = req.params.id;
            const updateMark = req.body;

            const query = { _id: new ObjectId(id) };
            const giveMark = {
                $set: {

                    obtainedMark: updateMark.obtainedMark,
                    feedback: updateMark.feedback,
                    pendingStatus: updateMark.status
                }
            }
            const result = await submittedAssignmentCollection.updateOne(query, giveMark);
            res.send(result);
        })



        // read all images for banner section from assignments collection
        app.get('/assignmentsImages', async (req, res) => {


            const result = await assignmentCollection.find().toArray();
            res.send(result);
        })




        // read all completed assignments from submittedAssignments collection for one extra feature
        app.get('/completedAssignments/:rank', async (req, res) => {
            const rank = req.params.rank;
            const query = { pendingStatus: 'Completed' };

            if (rank === 'High to Low') {
                const options = {
                    sort: { obtainedMark: -1 },
                    projection: { _id: 0, photoUrl: 1, title: 1, submittedUser: 1, obtainedMark: 1, feedback: 1 },
                };
                const result = await submittedAssignmentCollection.find(query, options).toArray();
                res.send(result);
            }
            else {
                const options = {
                    sort: { obtainedMark: 1 },
                    projection: { _id: 0, photoUrl: 1, title: 1, submittedUser: 1, obtainedMark: 1, feedback: 1 },
                };
                const result = await submittedAssignmentCollection.find(query, options).toArray();
                res.send(result);
            }
        })



        // read all from feature collection
        app.get('/feature', async (req, res) => {

            const result = await featureCollection.find().toArray();
            res.send(result);
        })









        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Online Group Study server is running')
})


app.listen(port, () => {
    console.log(`Online Group Study server is running on port: ${port}`)
})