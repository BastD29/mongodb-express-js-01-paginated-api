const express = require("express");
const User = require("./userModel");
const mongoose = require("mongoose");

const app = express();

mongoose
  .connect(
    "mongodb+srv://bastiendaniel9:bastiendaniel9@paginated-api.vlyw1dh.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("connected to database");
    app.listen(3000, () => {
      console.log("listening for requests on port 3000");
    });
  })
  .catch((err) => {
    console.log(err);
  });

const db = mongoose.connection;

db.once("open", async () => {
  if ((await User.countDocuments().exec()) > 0) return;
  console.log(await User.countDocuments().exec());

  try {
    for (let i = 1; i <= 12; i++) {
      await User.create({ name: `User ${i}` });
    }
    console.log("Added users");
  } catch (err) {
    console.error("Error adding users:", err);
  }
});

app.get("/users", paginatedResults(User), (req, res) => {
  res.json(res.paginatedResults);
});

function paginatedResults(model) {
  return async (req, res, next) => {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    // page - 1 as array begins at 0 (the first page will always be at position array[0])
    // limit is the number of users cards by page
    // so page begins at startIndex, and ends at endIndex
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // here we create an object to be able to store the array of pages under the name of results
    const results = {};

    // check if our end is somewhere before the end of the users array
    // so if we have extra users to query, we will show them at the next page
    if (endIndex < (await model.countDocuments().exec())) {
      results.next = {
        page: page + 1,
        limit: limit,
      };
    }

    // check if we have a previous page
    // to make impossible to have a page equal to 0 (we should never have a page 0)
    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit,
      };
    }

    // results.results = model.slice(startIndex, endIndex);

    try {
      results.results = await model.find().limit(limit).skip(startIndex).exec();
      res.paginatedResults = results;
      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }

    res.paginatedResults = results;
    next();
  };
}
