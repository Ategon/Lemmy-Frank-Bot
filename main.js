import { format, getWeekOfMonth } from 'date-fns';
import { stripIndents } from 'common-tags';
import LemmyBot from 'lemmy-bot';
import chalk from 'chalk';
import sqlite3 from 'sqlite3';
import 'dotenv/config';

console.log(`${chalk.magenta('STARTED:')} Started Bot`)

// -----------------------------------------------------------------------------
// Databases

const postdb = new sqlite3.Database('frank.sqlite3', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the database.');

    postdb.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY,
        feature_type TEXT,
        days_left INTEGER
    )`, (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Loaded posts table');
    });

    postdb.run(`CREATE TABLE IF NOT EXISTS time (
        key TEXT PRIMARY KEY,
        value INTEGER
    )`, (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Loaded time table');

        postdb.run(`INSERT OR IGNORE INTO time (key, value) VALUES ('day', 0)`, (err) => {
            if (err) {
                return console.error(err.message);
            }
        });
    });
});

// -----------------------------------------------------------------------------
// Data

const communities = [
    {
        slug: 'godot',
        short: 'Godot',
        instance: 'programming.dev',
        categories: [
            'weekly_discussion',
            'tutorial_tuesday',
            'welcoming_wednesday',
            'feedback_friday',
            'screenshot_saturday',
            'showcase_sunday',
        ]
    },
    {
        slug: 'gamedev',
        short: 'GameDev',
        instance: 'programming.dev',
        categories: [
            'weekly_discussion',
            'feedback_friday',
            'screenshot_saturday',
        ]
    },
    {
        slug: 'unreal_engine',
        short: 'Unreal',
        instance: 'programming.dev',
        categories: [
            'weekly_discussion',
            'tutorial_tuesday',
            'welcoming_wednesday',
            'feedback_friday',
            'screenshot_saturday',
            'showcase_sunday',
        ]
    },
    {
        slug: 'unity',
        short: 'Unity',
        instance: 'programming.dev',
        categories: [
            'weekly_discussion',
            'tutorial_tuesday',
            'welcoming_wednesday',
            'feedback_friday',
            'screenshot_saturday',
            'showcase_sunday',
        ]
    },
]

const posts = [
    {
        name: 'Weekly Discussion - %{WEEKLYDATE}',
        body: stripIndents`
            Welcome to the %{COMSHORT} community's weekly discussion!

            This is a place where you can do general chat in the community for things that might not deserve their own post.
            `,
        category: 'weekly_discussion',
        cron: '0 1 0 * * 1',
        pin: true,
        pin_length: 7,
        pin_check: 'Weekly Discussion'
    },
    {
        name: 'Tutorial Tuesday',
        body: stripIndents`
            Welcome to Tutorial Tuesday! This is a weekly thread where you can post any kind of tutorial for how to do things or request one from others.
            
            Text tutorials, video tutorials, image tutorials, linking to a post in the community, etc. are all allowed. If you feel it deserves its own post feel free to instead post it as a separate post and then link it here.
            `,
        category: 'tutorial_tuesday',
        cron: '0 1 0 * * 2',
        pin: true,
        pin_length: 1,
        pin_check: 'Tutorial Tuesday'
    },
    {
        name: 'Welcoming Wednesday',
        body: stripIndents`
            Welcome to Welcoming Wednesday! This is a day all about helping new people in the community get started.

            If you’re new feel free to post questions, post things that you’re struggling with, or introduce yourself to the community! 
            `,
        category: 'welcoming_wednesday',
        cron: '0 1 0 * * 3',
        pin: true,
        pin_length: 1,
        pin_check: 'Welcoming Wednesday'
    },
    {
        name: 'Feedback Friday',
        body: stripIndents`
            Welcome to Feedback Friday! This is a day all about getting feedback on your projects.

            Have a scene in your game that you want to know if it looks good? Have a mechanic prototype that you want tested? Want to know if your steam page is good? Or do you want feedback on some other part of your game? Feel free to post them below for others to give feedback!
            `,
        category: 'feedback_friday',
        cron: '0 1 0 * * 5',
        pin: true,
        pin_length: 1,
        pin_check: 'Feedback Friday'
    },
    {
        name: 'Screenshot Saturday',
        body: stripIndents`
            Welcome to Screenshot Satuday!

            This is a day all about showing off what you've been working on. Feel free to post screenshots, gifs, videos, etc. of your game or project.
            `,
        category: 'screenshot_saturday',
        cron: '0 1 0 * * 6',
        pin: true,
        pin_length: 1,
        pin_check: 'Screenshot Saturday'
    },
    {
        name: 'Showcase Sunday',
        body: stripIndents`
            Welcome to Showcase Sunday!

            Are you making anything in %{COMSHORT}? Feel free to discuss it below or show off your progress!
            `,
        category: 'showcase_sunday',
        cron: '0 1 0 * * 0',
        pin: true,
        pin_length: 1,
        pin_check: 'Showcase Sunday'
    },
]

// -----------------------------------------------------------------------------
// Main Bot Code

// Create the list of communities the bot will be interacting in
const allowList = []

for (const community of communities) {
    const allowListEntry = allowList.find((item) => item.instance == community.instance)

    if (allowListEntry) {
        allowListEntry.communities.push(community.slug)
    }
    else {
        allowList.push({
            instance: community.instance,
            communities: [community.slug]
        })
    }
}


// Create the scheduled posts
const scheduledPosts = []

for (const post of posts) {
    scheduledPosts.push({
        cronExpression: post.cron,
        timezone: 'America/Toronto',
        doTask: async ({getCommunityId, createPost}) => {
            for (const community of communities) {
                if (community.categories.includes(post.category)) {
                    const communityId = await getCommunityId(community.slug)
                    const postname = post.name.replace('%{WEEKLYDATE}', format(new Date(), 'MMM \'week %{WN},\' yyyy').replace('%{WN}', getWeekOfMonth(new Date()))).replace('%{COMSHORT}', community.short);
                    const postbody = post.body.replace('%{COMSHORT}', community.short);
                    await createPost({ name: postname, body: postbody, community_id: communityId})
                    console.log(`${chalk.blue('POSTED:')} Created ${postname} for ${community.slug}`);
                }
            }
        },
    })
}


// Bot Creation
const bot = new LemmyBot.LemmyBot({
    instance: process.env.INSTANCE,
    credentials: {
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
    },
    dbFile: 'db.sqlite3',
    federation: {
        allowList: allowList,
    },
    handlers: {
        post: {
            handle: async ({
                postView: {
                    post,
                    creator
                },
                botActions: { featurePost },
            }) => {
                // Pin post if its by the bot and set to be pinned
                if (creator.name == process.env.USERNAME && posts.find((item) => item.pin && post.name.startsWith(item.pin_check))) {
                    await featurePost({postId: post.id, featureType: "Community", featured: true})
                    console.log(`${chalk.green('FEATURED:')} Featured ${post.name} in ${post.community_id} by ${creator.name}`)

                    // Add to db
                    postdb.run(`INSERT INTO posts (id, days_left) VALUES (${post.id}, ${posts.find((item) => item.pin && post.name.startsWith(item.pin_check)).pin_length})`, (err) => {
                        if (err) {
                            return console.error(err.message);
                        }
                    });
                }
            }
        }
    },
    schedule: [...scheduledPosts, {
        cronExpression: '0 */5 * * * *',
        timezone: 'America/Toronto',
        doTask: async ({ featurePost }) => {
            const now = addMinutes(new Date(), 30);
            const day = now.getDay();

            postdb.get(`SELECT value FROM time WHERE key = 'day'`, (err, row) => {
                if (err) {
                    return console.error(err.message);
                }

                if (row.value !== day) {
                    postdb.run(`UPDATE time SET value = ${day} WHERE key = 'day'`, (err) => {
                        if (err) {
                            return console.error(err.message);
                        }
                    });

                    console.log(`${chalk.magenta('TIME:')} Updated day to ${day}`);
                    // decrement all post times by 1
                    postdb.run(`UPDATE posts SET days_left = days_left - 1`, (err) => {
                        if (err) {
                            return console.error(err.message);
                        }

                        console.log(`${chalk.magenta('TIME:')} Decremented all post times`);

                        // get all posts with 0 days left and unpin them
                        postdb.all(`SELECT * FROM posts WHERE days_left = 0`, async (err, rows) => {
                            if (err) {
                                return console.error(err.message);
                            }

                            for (const row of rows) {
                                await featurePost({postId: row.post_id, featureType: "Community", featured: false})
                                console.log(`${chalk.green('UNFEATURED:')} Unfeatured ${row.post_id} in ${row.community_id}`);
                            }

                            // delete all posts with 0 days left
                            postdb.run(`DELETE FROM posts WHERE days_left = 0`, (err) => {
                                if (err) {
                                    return console.error(err.message);
                                }

                                console.log(`${chalk.magenta('TIME:')} Deleted all posts with 0 days left`);
                            });
                        });
                    });
                }
            });
        }
    }]
});

bot.start();