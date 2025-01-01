import express from "express";
import db from "../db.js";
import LangflowClient from "../langflow.js";
import cors from "cors";

async function analyseData(data) {
  // console.log("Data in analyseData=",data)
  const analysis = {};
  data.forEach((post) => {
    if (!analysis[post.postType]) {
      analysis[post.postType] = {
        likes: 0,
        shares: 0,
        comments: [],
        count: 0,
      };
    }
    analysis[post.postType].likes += post.likes;
    analysis[post.postType].shares += post.shares;
    analysis[post.postType].comments.push(...post.comments);
    analysis[post.postType].count++;
  });

  let results = Object.keys(analysis).map((type) => ({
    postType: type,
    avgLikes: (analysis[type].likes / analysis[type].count).toFixed(2),
    avgShares: (analysis[type].shares / analysis[type].count).toFixed(2),
    // avgComments: (analysis[type].comments / analysis[type].count).toFixed(2),
    allComments: analysis[type].comments,
  }));

  // console.log(results);

  const inputValue =
    "You are a social media analytics assistant. Give insights(minimum 5 points) about the input data. Also Analyse data on the basis of comments and give positive rate of each type of post ie. reel, carousel and static image according to comments. Example outputs: 1. Carousel posts have 20% higher engagement than static posts. 2. Reels drive 2x more comments compared to other formats. Give output as array of strings (sentences) in text format. Example output format: { insights: ['', ''], positive_rate: [75, 95, 80]}.\n Below is the input data for analysis \n postType, likes, shares, comments\n" +
    JSON.stringify(results);

  const flowResponse = await langflowClient.runFlow(
    "22d5c0f9-0d13-4e47-9207-2f4a00ef1bb9",
    "3e8cebc1-edfc-423f-870d-fd1ca30a3dee",
    inputValue
  );

  const resp = flowResponse.outputs[0].outputs[0].results.message.text;

  // console.log(insights);
  // console.log(results);
  const output = JSON.parse(resp.trim().substring(7, resp.length - 4));

  const insights = output.insights;
  const positive_rate = output.positive_rate;

  // console.log(results);

  results[0].allComments = positive_rate[0];
  results[1].allComments = positive_rate[1];
  results[2].allComments = positive_rate[2];

  console.log("Done");

  return { results, insights };
}

const router = express.Router();
router.use(cors());
const langflowClient = new LangflowClient(
  "https://api.langflow.astra.datastax.com",
  process.env.APPLICATION_TOKEN
);

router.post("/analysis", async (req, res) => {
  const data = req.body;
  // console.log("Data in post route",data);
  try {
    // const postsCollection = db.collection("posts");
    // const data = await postsCollection.find({}).toArray();
    // console.log("data\n", data);
    const { results, insights } = await analyseData(data.data);
    res.json({ data: results, insights });
  } catch (error) {
    console.error("Error in analyse route:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/analysis", async (req, res) => {
  try {
    const postsCollection = db.collection("posts");
    const data = await postsCollection.find({}).toArray();

    // console.log("Data in get route",data)
    // console.log(typeof data)

    const { results, insights } = await analyseData(data);

    // console.log("Langflow response: ",insights2);

    res.json({ data: results, insights });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
