// ****************************** //
// POC - DO NOT USE IN PRODUCTION //
// ****************************** //

import Router from "express"
import passport from "passport"
import util from "util"
import url from "url"
import querystring from "querystring"
import { User } from "db/model/User"

const router = Router()

// Populate res.locals with currently logged in user
router.use(async function (req, res, next) {
    if (req.user) {
        res.locals.user = await User.findOne({
            email: req.user.emails[0].value,
        })
    }
    next()
})

// Perform the login, after login Auth0 will redirect to callback
router.get(
    "/login",
    passport.authenticate("auth0", {
        scope: "openid email profile",
    }),
    function (req, res) {
        res.redirect("/")
    }
)

// Perform the final stage of authentication and redirect to previously requested URL or '/user'
router.get("/callback", function (req, res, next) {
    passport.authenticate("auth0", function (err, user, info) {
        if (err) {
            return next(err)
        }
        if (!user) {
            return next("No user found.")
        }
        req.logIn(user, async function (err) {
            if (err) {
                return next(err)
            }
            const returnTo = req.session?.returnTo
            delete req.session?.returnTo

            res.redirect(returnTo || "/admin/charts")
        })
    })(req, res, next)
})

// Perform session logout and redirect to /login
router.get("/logout", (req, res) => {
    req.logout()

    let returnTo = req.protocol + "://" + req.hostname
    const port = req.connection.localPort
    if (port !== undefined && port !== 80 && port !== 443) {
        returnTo += ":" + port
    }
    returnTo += "/login"

    const logoutURL = new url.URL(
        util.format("https://%s/v2/logout", process.env.AUTH0_DOMAIN)
    )
    const searchString = querystring.stringify({
        client_id: process.env.AUTH0_CLIENT_ID,
        returnTo: returnTo,
    })
    logoutURL.search = searchString

    res.redirect(logoutURL.toString())
})

export default router
