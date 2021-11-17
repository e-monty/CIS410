const jwt = require("jsonwebtoken");

const db = require("../dbConnectExec.js");
const rockwellConfig = require("../config.js");

const auth = async (req, res, next) => {
  //   console.log("in the middleware", req.header("Authorization"));
  //   next();

  try {
    //1. DECODE TOKEN

    let myToken = req.header("Authorization").replace("Bearer ", "");
    // console.log("token", myToken);

    let decoded = jwt.verify(myToken, rockwellConfig.JWT);
    console.log(decoded);

    let contactPK = decoded.pk;

    //2. COMPARE TOKEN WITH DB

    let query = `SELECT ContactPK, NameFirst, NameLast, Email
    FROM Contact
    WHERE ContactPK=${contactPK} and token = '${myToken}'`;

    let returnedUser = await db.executeQuery(query);
    console.log("returned user", returnedUser);

    //3. SAVE USER INFO IN REQUEST
    if (returnedUser[0]) {
      req.contact = returnedUser[0];
      next();
    } else {
      return res.status(401).send("Invalid credentials");
    }
  } catch (err) {
    console.log(err);
    return res.status(401).send("Invalid credentials");
  }
};

module.exports = auth;
