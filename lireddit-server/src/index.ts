import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import mikroConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import RedisStore from "connect-redis";
import session from "express-session";
import { createClient } from "redis";
import { MyContext } from "./types";

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  await orm.getMigrator().up();
  const ormFork = orm.em.fork({});
  const app = express();

  // Initialize client.
  let redisClient = createClient();
  redisClient.connect().catch(console.error);

  // Initialize store.
  let redisStore = new RedisStore({
    client: redisClient,
    prefix: "myapp:",
    disableTouch: true,
  });

  // Initialize sesssion storage.
  app.use(
    session({
      name: "qid",
      store: redisStore,
      resave: false, // required: force lightweight session keep alive (touch)
      saveUninitialized: false, // recommended: only save session when data exists
      secret: "keyboard cat",
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: "lax",
        secure: __prod__,
      }, // 10 Years
    })
  );
  async function startServer() {
    const apolloServer = new ApolloServer({
      schema: await buildSchema({
        resolvers: [PostResolver, UserResolver],
        validate: false,
      }),
      context: ({ req, res }): MyContext => ({ em: ormFork, req, res }),
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({ app });
  }
  startServer();

  //   app.get("/", (_, res) => {
  //     res.send("Hello Request");
  //   });
  app.listen(4000, () => {
    console.log("Server started on localhost:4000");
  });

  //   const post = orm.em.fork({}).create(Post, {
  //     title: "My First Post",
  //     createdAt: "",
  //     updatedAt: "",
  //   });
  //   await orm.em.fork({}).persistAndFlush(post);
  //   const posts = await ormFork.find(Post, {});
  //   console.log(posts);
};

main().catch((err) => console.error(err));
