const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');

// for mongodb connection
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// port selection 
const port = process.env.PORT || 4000;

// middleware
const corsOptions = {
    origin: ['http://localhost:3000','https://symphonious-rabanadas-4f10f9.netlify.app','https://airbnb-frontend-black.vercel.app'],
  }
  app.use(cors(corsOptions));
  app.use(express.json());


//   mongodb connection uri 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dsubcfq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// connecting to the database
async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
    //   await client.connect();
    const listingsCollection = client.db("AirbnbDB").collection("Airbnbcollection");

     
    // getting all the listing
    app.get('/listings', async (req, res) => {

        const totalBeforeTaxes = req.query.displayTotalBeforeTaxes;
        const category = req.query.category;
        const values = req.query.values ? req.query.values.split(',') : [];
        const selectedAmenities = req.query.selectedAmenities ? req.query.selectedAmenities.split(',') : [];
        const lowerPrice = values[0] ? Number(values[0]) : null;
        const upperPrice = values[1] ? Number(values[1]) : null;

        //search query
        const checkIn= req.query.checkIn;
        const checkOut= req.query.checkOut;
        const guestCount= parseInt(req.query.guestCount);
        const formattedLocation = req.query.s_value;
        

        // console.log(checkIn, checkOut, guestCount,formattedLocation);

        // for filter bedroomCount, bedsCount, bathroomCount
        const bedroomCount = parseInt(req.query.bedroomCount);
        const bedsCount = parseInt(req.query.bedsCount);
        const bathroomCount = parseInt(req.query.bathroomCount);
       
        // console.log(typeof bedroomCount, typeof bedsCount, typeof bathroomCount);

        //need to handle the query 
        let query = {};
        if (category && category !== "All Listings") {
            query = { category: category };
        }
        
        // console.log(lowerPrice, upperPrice);
        // console.log(typeof values);
        // console.log(selectedAmenities);
        // console.log(typeof selectedAmenities);

        // Add price range to query if values are provided
        if (values && values.length > 1) {
      
            query = {
                ...query,
                'price.perNight': { $gte: lowerPrice, $lte:upperPrice  }
            };
            // console.log('inside values',query)
        }
        
        // Add amenities to query if selectedAmenities are provided
        if (selectedAmenities.length > 0) {
            query = {
                ...query,
                amenities: { $all: selectedAmenities }
            };
        }

        // Add check-in and check-out dates to the query if they are provided
        if (checkIn && checkOut) {
            query = {
                ...query,
                bookedDates: {
                    $not: {
                        $elemMatch: {
                            $gte: new Date(checkIn),
                            $lte: new Date(checkOut)
                        }
                    }
                }
            };
        }

        

        // Add location components to the query
        if (formattedLocation) {
            const [city, state, country] = formattedLocation?.split(',').map(part => part.trim());
            query = {
                ...query,
                "location.city": city,
                "location.state": state,
                "location.country": country
            };
        }
              
            // Add guest count to the query if it is provided
        if (guestCount) {
            query = {
                ...query,
                guestCount: { $gte: guestCount }
            };
        }
            // query for bedrooms
            if(bedroomCount){
                query = {
                    ...query,
                    bedrooms: { $gte: bedroomCount }
                };
            }
            // query for beds
            if(bedsCount){
                query = {
                    ...query,
                    beds: { $gte: bedsCount }
                };
            }
            // query for bathrooms
            if(bathroomCount){
                query = {
                    ...query,
                    bathrooms: { $gte: bathroomCount }
                };
            }
       

        // Now `query` contains the conditions for price range and selected amenities
        // console.log(query);
    
        

        const listings = await listingsCollection.find(query).toArray();

        // to handle the total before taxes 

        if (totalBeforeTaxes === 'true') {
            listings.forEach((listing) => {
                listing.totalPriceBeforeTaxes =  listing?.price?.perNight * listing?.bookedDates?.length;
                // console.log(listing.totalPriceBeforeTaxes);
            });
        }
        


        

        res.send(listings);
        // console.log(listings);
       

  
        
    });

    //getting search data 
    app.get('/locations', async (req, res) => {
        const search = req.query.search; 
    
        try {
            // Fetch locations from the database according to the search query
            const query = search
                ? {
                      $or: [
                          { "location.city": { $regex: search, $options: 'i' } },
                          { "location.state": { $regex: search, $options: 'i' } },
                          { "location.country": { $regex: search, $options: 'i' } },
                      ],
                  }
                : {}; 
    
            const locations = await listingsCollection.find(query, { projection: { location: 1 } }).limit(5).toArray();
            
            const formattedLocations = locations.map(location => ({
                id: location._id,
                label: `${location.location.city}, ${location.location.state}, ${location.location.country}`,
            }));
    
            // Remove duplicates
            const uniqueLocations = [];
            const labels = new Set();
            for (const loc of formattedLocations) {
                if (!labels.has(loc.label)) {
                    labels.add(loc.label);
                    uniqueLocations.push(loc);
                }
            }
    
            res.send(uniqueLocations);
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: "Failed to fetch locations" });
        }
    });
      
    // this for price range 
    const priceRanges = [
        { min: 0, max: 50 },
        { min: 51, max: 100 },
        { min: 101, max: 150 },
        { min: 151, max: 200 },
        { min: 201, max: 250 },
        { min: 251, max: 300 },
        { min: 301, max: 350 },
        { min: 351, max: 400 },
        { min: 401, max: 450 },
        { min: 451, max: 500 },
        { min: 501, max: 550 },
        { min: 551, max: 600 },
        { min: 601, max: 650 },
        { min: 651, max: 700 },
        { min: 701, max: 750 },
        { min: 751, max: 800 },
        { min: 801, max: 850 },
        { min: 851, max: 900 },
        { min: 901, max: 950 },
        { min: 951, max: 1000 }
    ];
    app.get('/price-range-count', async (req, res) => {
        try {
            const counts = await Promise.all(priceRanges.map(async (range) => {
                const count = await listingsCollection.countDocuments({
                    'price.perNight': {
                        $gte: range.min,
                        $lte: range.max
                    }
                });
                return { priceRange: [range.min, range.max], count };
            }));
    
            res.send(counts);
            // console.log(counts)
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: "Failed to fetch price range counts" });
        }
    });


    //   await client.db("admin").command({ ping: 1 });
    //   console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
    //   await client.close();
    }
  }
  run().catch(console.dir);

// checking the connection

app.get('/', (req, res) => {
    res.send('airbnb working')
})

app.listen(port, () => {

    console.log(`airbnb is working on port ${port}`);
})
