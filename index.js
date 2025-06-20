const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config({ path: "./sample.env" });
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
let Exercise;
const exerciseSchema = () => {
  const exerciseSchema = new mongoose.Schema({
    username: { type: String },
    log: [
      {
        description: String,
        duration: Number,
        date: {
          type: Date,
          default: Date.now(),
        },
      },
    ],
  });
  Exercise = mongoose.model("Person", exerciseSchema);
  console.log("Person model created successfully");
};
exerciseSchema();

app.post("/api/users", async (req, res) => {
  try {
    const existingUser = await Exercise.find({ username: req.body.username });
    console.log(existingUser.length);
    if (existingUser.length !== 0) {
      return res.status(200).json({
        username: existingUser[0].username,
        _id: existingUser[0]._id,
      });
    }

    let user = await Exercise.create({ username: req.body.username });
    return res.status(200).json({
      username: user.username,
      _id: user._id,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Error creating user" });
  }

  // Exercise.create({ username: req.body.username }, (err, data) => {
  //   if (err) return res.status(500).json({ error: 'Error creating user' });
  //   return res.status(200).json({
  //     username: data.username,
  //     _id: data._id
  //   });
  // })
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  const exerciseDate = date
    ? new Date(date).toDateString()
    : new Date().toDateString();
  try {
    const user = await Exercise.findByIdAndUpdate(
      { _id },
      {
        $push: {
          log: {
            description,
            duration: parseInt(duration),
            date: exerciseDate,
          },
        },
      },

      { new: true, runValidators: true }
    );
    res.status(200).json({
      _id: user._id,
      username: user.username,
      description: description,
      duration: parseInt(duration),
      date: exerciseDate,
    });
  } catch (err) {
    return res.status(500).json({ error: "Error adding exercise" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await Exercise.find().select("username _id __v");
    // console.log(users);
    res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ error: "Error fetching users" });
  }
});
app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const findUser = await Exercise.findById(_id);
    if (!findUser) return res.status(404).json({ error: "User not found" });

    let log = findUser.log.map((entry) => ({
      description: entry.description,
      duration: entry.duration,
      date: new Date(entry.date).toDateString(),
    }));

    if (from && to) {
      const fromDate =  new Date(from);
      const toDate = new Date(to);

      log = log.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= fromDate && entryDate <= toDate;
      });
    }

    if (limit) {
      log = log.slice(0, parseInt(limit));
    }

    res.status(200).json({
      _id: findUser._id,
      username: findUser.username,
      count: log.length,
      log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
