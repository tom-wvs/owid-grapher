// This import has side-effects to do with React import binding, keep it up here
import { ADMIN_SERVER_PORT, ADMIN_SERVER_HOST, ENV } from "settings"

import * as db from "db/db"
import * as wpdb from "db/wpdb"
import { log } from "utils/server/log"

import express from "express"
require("express-async-errors")
import cookieParser from "cookie-parser"
const expressErrorSlack = require("express-error-slack")
import "reflect-metadata"
import { IndexPage } from "./pages/IndexPage"
// import { authMiddleware } from "./utils/authentication"
import authMiddlewareAuth0 from "./utils/authenticationAuth0"
import { apiRouter } from "./apiRouter"
import { testPageRouter } from "./testPageRouter"
import { adminRouter } from "./adminRouter"
import { renderToHtmlPage } from "utils/server/serverUtil"
import { SLACK_ERRORS_WEBHOOK_URL } from "serverSettings"

import * as React from "react"
import { publicApiRouter } from "./publicApiRouter"
import { mockSiteRouter } from "./mockSiteRouter"
import session from "express-session"
import passport from "passport"
const Auth0Strategy = require("passport-auth0")

const app = express()

// since the server is running behind a reverse proxy (nginx), we need to "trust"
// the X-Forwarded-For header in order to get the real request IP
// https://expressjs.com/en/guide/behind-proxies.html
app.set("trust proxy", true)

// Parse cookies https://github.com/expressjs/cookie-parser
// app.use(cookieParser())

app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Configure Passport to use Auth0
var strategy = new Auth0Strategy(
    {
        domain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        callbackURL:
            process.env.AUTH0_CALLBACK_URL || "http://localhost:3030/callback",
    },
    function (
        accessToken: any,
        refreshToken: any,
        extraParams: any,
        profile: any,
        done: (arg0: null, arg1: any) => any
    ) {
        // accessToken is the token to call Auth0 API (not needed in the most cases)
        // extraParams.id_token has the JSON Web Token
        // profile has all the information from the user
        return done(null, profile)
    }
)

passport.use(strategy)

// You can use this section to keep a smaller payload
// TOOD do not store the whole user object in the session
passport.serializeUser(function (user, done) {
    done(null, user)
})

passport.deserializeUser(function (user, done) {
    done(null, user)
})

// config express-session
var sess = {
    secret: "CHANGE THIS TO A RANDOM SECRET",
    cookie: {} as any,
    resave: false,
    saveUninitialized: true,
}

if (app.get("env") === "production") {
    // Use secure cookies in production (requires SSL/TLS)
    sess.cookie.secure = true

    // Uncomment the line below if your application is behind a proxy (like on Heroku)
    // or if you're encountering the error message:
    // "Unable to verify authorization request state"
    // app.set('trust proxy', 1);
}

app.use(session(sess))
app.use(passport.initialize())
app.use(passport.session())

app.use(authMiddlewareAuth0)

// Require authentication (only for /admin requests)
// app.use(authMiddleware)

//app.use(express.urlencoded())

app.use("/api", publicApiRouter.router)

app.use("/admin/api", apiRouter.router)
app.use("/admin/test", testPageRouter)

app.use("/admin/build", express.static("dist/webpack"))
app.use("/admin/storybook", express.static(".storybook/build"))
app.use("/admin", adminRouter)

// Default route: single page admin app
app.get("/admin/*", (req, res) => {
    res.send(
        renderToHtmlPage(
            <IndexPage
                username={res.locals.user.fullName}
                isSuperuser={res.locals.user.isSuperuser}
            />
        )
    )
})

// Send errors to Slack
// The middleware passes all errors onto the next error-handling middleware
if (SLACK_ERRORS_WEBHOOK_URL) {
    app.use(expressErrorSlack({ webhookUri: SLACK_ERRORS_WEBHOOK_URL }))
}

const IS_DEV = ENV === "development"
if (IS_DEV) app.use("/", mockSiteRouter)

// Give full error messages, including in production
app.use(async (err: any, req: any, res: express.Response, next: any) => {
    if (!res.headersSent) {
        res.status(err.status || 500)
        res.send({
            error: { message: err.stack || err, status: err.status || 500 },
        })
    } else {
        res.write(
            JSON.stringify({
                error: { message: err.stack || err, status: err.status || 500 },
            })
        )
        res.end()
    }
})

async function main() {
    try {
        await db.connect()

        // The Grapher should be able to work without Wordpress being set up.
        try {
            await wpdb.connect()
        } catch (error) {
            console.error(error)
            console.log(
                "Could not connect to Wordpress database. Continuing without Wordpress..."
            )
        }

        const server = app.listen(ADMIN_SERVER_PORT, ADMIN_SERVER_HOST, () => {
            console.log(
                `owid-admin server started on ${ADMIN_SERVER_HOST}:${ADMIN_SERVER_PORT}`
            )
        })
        // Increase server timeout for long-running uploads
        server.timeout = 5 * 60 * 1000
    } catch (e) {
        log.error(e)
        process.exit(1)
    }
}

if (!module.parent) main()
