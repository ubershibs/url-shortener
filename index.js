var express = require('express');
var env = require('node-env-file');
var app = express() //Creates the application
var port = process.env.PORT||3000;
var path = require('path');
var validUrl = require('valid-url');
var mongo = require('mongodb').MongoClient;

env(__dirname + '/.env');
var dbUrl = process.env.MONGODB_URI;

mongo.connect(dbUrl, function(err, db) {
  console.log("connected to db");
  app.use(express.static(path.join(__dirname, 'public')))

  app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'))
  })

  app.get('/new/:url*', function(req, res) {
    //slice '/new/' off the URL
    var url = req.url.slice(5);
    var shortUrl = '';
    //check to see that it is valid
    if (!validUrl.isUri(url, sites)) {
      //if not, error
      res.json({
        error: "You must provide a valid URL to be shortened"
      })
    } else {
      //search for valid urls in the db
      var sites = db.collection("sites");
      sites.findOne({longUrl: url}, function(err, doc) {
        if (err) throw err;
        if(doc) {
          //if it's in there but somehow missing a shortUrl, create one
          if (!doc.shortUrl) {
            shortUrl = generateShortUrl(doc._id, sites)
          } else {
            shortUrl = doc.shortUrl;
          }
          //serve the short URL up
          res.json({
            shortUrl: 'http://localhost:3000/' + shortUrl
          })
        } else {
          //if it's not yet in the DB at all, add it, get the ID, and chop it
          sites.insertOne({longUrl: url}, function(err, doc) {
            if (err) throw err;
            if (doc) {
              shortUrl = generateShortUrl(doc.ops[0]._id, sites);
              res.json({ shortUrl: 'http://localhost:3000/' + shortUrl })
            }
          })
        }
      })
    }
  })

  //if the user provides a shortUrl, check it against the DB and redirect
  app.get('/:id', function(req, res) {
    var urlId = req.params.id;
    var longUrl = '';
    var sites = db.collection('sites');
    sites.findOne({shortUrl: urlId}, function(err, doc) {
      if(err) throw err;
      if(doc.longUrl) {
        longUrl = doc.longUrl;
        res.redirect(longUrl);
      } else {
        res.json({
          error: "No matching URL found in our database."
        })
      }
    })
  })

  var server = app.listen(port, function() {
    console.log('Server listening on port' + port)
  });
})

function generateShortUrl(id, sites) {
  idString = JSON.stringify(id);
  shortUrl = idString.substring(19,25);
  sites.update({_id: id}, {$set: {shortUrl: shortUrl}});
  return shortUrl;
}
