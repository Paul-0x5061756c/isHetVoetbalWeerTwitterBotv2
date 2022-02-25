require("dotenv").config();

const cron = require("node-cron");
const axios = require("axios");
const moment = require("moment");
const { TwitterClient } = require("twitter-api-client");
const fs = require("fs");

const twitterClient = new TwitterClient({
	apiKey: process.env.TWITTER_API_KEY,
	apiSecret: process.env.TWITTER_API_SECRET,
	accessToken: process.env.TWITTER_ACCESS_TOKEN,
	accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const weatherDescriptionMapping = {
	Clouds: "bewolkt",
	Clear: "helder",
	Mist: "mistig",
	Snow: "aan het sneeuwen",
	Rain: "regenachtig",
	Drizzle: "miezerig",
};

const canWePlayFootball = (temp, desc) => {
	const notSoNiceCondition = ["Rain", "Drizzle", "Snow"];
	if (temp > 10) {
		return notSoNiceCondition.indexOf(desc) === -1
			? "Ja, het is heerlijk"
			: "Nee, temperatuur is lekker, maar kans op neerslag";
	} else {
		return notSoNiceCondition.indexOf(desc) === -1
			? "Ja, maar wel wat fris"
			: "Nee, het is houd & kans op neerslag";
	}
};

async function getWeather() {
	return await axios
		.get(
			`${process.env.WEATHER_URL}&appid=${process.env.WEATHER_API_KEY}&units=metric`
		)
		.then((resp) => resp.data);
}

async function createTweet(weather) {
	const time = moment().tz("Europe/Amsterdam").format("LT");
	const canWePlay = canWePlayFootball(
		weather.main.temp,
		weather.weather[0].main
	);
	const desc = weatherDescriptionMapping[weather.weather[0].main];
	return `[${time}] ${canWePlay}. De huidige temperatuur ligt rond de ${weather.main.temp} graden & het is voornamelijk ${desc}. \n\n
	#voetbal #voetbalweer #football #weather #Levarne #ishetvoetbalweer`;
}

async function tweetWeather(tweet) {
	twitterClient.tweets
		.statusesUpdate({
			status: tweet,
		})
		.then((r) => console.log("tweeted: ", r))
		.catch((e) => console.log("error while tweeting: ", e));
}

async function changeProfileImage(tweet) {
	const fileName = tweet.split(",")[0] === "Ja" ? "ja" : "neen";
	const base64String = fs
		.readFileSync(`./assets/${fileName}.jpg`)
		.toString("base64");
	twitterClient.accountsAndUsers
		.accountUpdateProfileImage({
			image: base64String,
		})
		.then((r) => console.log("Changed profileimage: ", r))
		.catch((e) => console.log("error while change profile pic: ", e));
}

async function tweet() {
	const weather = await getWeather();
	const tweet = await createTweet(weather);
	await tweetWeather(tweet);
	await changeProfileImage(tweet);
}

const task = cron.schedule(
	"0 9,10,11,12,13,14,15,16,17,18 * * *",
	() => {
		tweet();
	},
	{
		scheduled: true,
		timezone: "Europe/Amsterdam",
	}
);

task.start();
