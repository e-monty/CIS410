const express = require("express");

const db = require("./dbConnectExec.js");

const app = express();

app.listen(5000, () => {
  console.log(`app is running on port 5000`);
});

app.get("/hi", (req, res) => {
  res.send("hello world");
});

app.get("/", (req, res) => {
  res.send("API is running");
});

// app.post();
// app.put();

app.get("/movies", (req, res) => {
  db.executeQuery(
    `SELECT *
  FROM movie
  LEFT JOIN Genre
  ON Genre.GenrePK = Movie.GenreFK`
  )
    .then((theResults) => {
      res.status(200).send(theResults);
    })
    .catch((myError) => {
      console.log(myError);
      res.status(500).send();
    });
});
