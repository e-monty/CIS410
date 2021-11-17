const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("./dbConnectExec.js");
const rockwellConfig = require("./config.js");
const auth = require("./middleware/authenticate");

const app = express();
app.use(express.json());

//azurewebsite.net, colostate.edu
app.use(cors());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`app is running on port ${PORT}`);
});

app.get("/hi", (req, res) => {
  res.send("hello world");
});

app.get("/", (req, res) => {
  res.send("API is running");
});

// app.post();
// app.put();

app.post("/reviews", auth, async (req, res) => {
  try {
    let movieFK = req.body.movieFK;
    let summary = req.body.summary;
    let rating = req.body.rating;

    if (!movieFK || !summary || !rating || !Number.isInteger(rating)) {
      return res.status(400).send("bad request");
    }

    summary = summary.replace("'", "''");
    // console.log("summary", summary);
    // console.log("here is the contact", req.contact);

    let insertQuery = `INSERT INTO Review(Summary, Rating, MovieFK, ContactFK)
    OUTPUT inserted.ReviewPK, inserted.Summary, inserted.Rating, inserted.MovieFK
    VALUES('${summary}', '${rating}', '${movieFK}', ${req.contact.ContactPK})`;

    let insertedReview = await db.executeQuery(insertQuery);
    // console.log("review", insertedReview);
    // res.send("here's the response");
    res.status(201).send(insertedReview[0]);
  } catch (err) {
    console.log("error in POST /reviews", err);
    res.status(500).send();
  }
});

app.get("/contacts/me", auth, (req, res) => {
  res.send(req.contact);
});

app.post("/contacts/login", async (req, res) => {
  // console.log("/contacts/login called", req.body);

  //1. DATA VALIDATION

  let email = req.body.email;
  let password = req.body.password;

  if (!email || !password) {
    return res.status(400).send("Bad request");
  }

  //2. CHECK THAT USER EXISTS IN DB

  let query = `SELECT *
  FROM Contact
  WHERE Email = '${email}'`;

  let result;
  try {
    result = await db.executeQuery(query);
  } catch (myError) {
    console.log("error in /contacts/login", myError);
    return res.status(500).send();
  }

  // console.log("result", result);

  if (!result[0]) {
    return res.status(401).send("Invalid user credentials");
  }

  //3. CHECK PASSWORD   ----->> !!!Always returns invalid!!! <<-----

  let user = result[0];

  // if (!bcrypt.compareSync(password, user.Password)) {
  //   console.log("invalid password");
  //   return res.status(401).send("Invalid user credentials");
  // }

  //4. GENERATE TOKEN

  let token = jwt.sign({ pk: user.ContactPK }, rockwellConfig.JWT, {
    expiresIn: "60 minutes",
  });
  console.log("token", token);

  //5. SAVE TOKEN IN DB AND SEND RESPONSE

  let setTokenQuery = `UPDATE Contact
  SET Token = '${token}'
  WHERE ContactPK = ${user.ContactPK}`;

  try {
    await db.executeQuery(setTokenQuery);

    res.status(200).send({
      token: token,
      user: {
        NameFirst: user.NameFirst,
        NameLast: user.NameLast,
        Email: user.Email,
        ContactPK: user.ContactPK,
      },
    });
  } catch (myError) {
    console.log("error in setting user token", myError);
    res.status(500).send();
  }
});

app.post("/contacts", async (req, res) => {
  // res.send("/contacts called");

  // console.log("request body", req.body);

  let nameFirst = req.body.nameFirst;
  let nameLast = req.body.nameLast;
  let email = req.body.email;
  let password = req.body.password;

  if (!nameFirst || !nameLast || !email || !password) {
    return res.status(400).send("Bad request");
  }

  nameFirst = nameFirst.replace("'", "''");
  nameLast = nameLast.replace("'", "''");

  let emailCheckQuery = `SELECT email
  FROM Contact
  WHERE Email = '${email}'`;

  let existingUser = await db.executeQuery(emailCheckQuery);

  // console.log("existing user", existingUser);

  if (existingUser[0]) {
    return res.status(409).send("Duplicate email");
  }

  let hashedPassword = bcrypt.hashSync(password);

  let insertQuery = `INSERT INTO Contact(NameFirst, NameLast, Email, Password)
  VALUES('${nameFirst}', '${nameLast}', '${email}', '${hashedPassword}')`;

  db.executeQuery(insertQuery)
    .then(() => {
      res.status(201).sendStatus();
    })
    .catch((err) => {
      console.log("error in POST /contact", err);
      res.status(500).send();
    });
});

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

app.get("/movies/:pk", (req, res) => {
  let pk = req.params.pk;
  // console.log(pk);
  let myQuery = `SELECT *
  FROM movie
  LEFT JOIN Genre
  ON Genre.GenrePK = Movie.GenreFK
  WHERE MoviePK = ${pk}`;

  db.executeQuery(myQuery)
    .then((result) => {
      // console.log("result", result);
      if (result[0]) {
        res.send(result[0]);
      } else {
        res.status(404).send(`bad request`);
      }
    })
    .catch((err) => {
      console.log("Error in /movies/:pk", err);
      res.status(500).send();
    });
});
