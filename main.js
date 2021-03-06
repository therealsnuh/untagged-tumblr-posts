/**
 * My Tumblr API key.  I should probably be keeping me secret, but it's
 * been online for over two years with no side effects.
 */
var API_KEY = "ii4TLRjfMoszcoDkrxBKUk5isHgx0ezQnJ8JWGntYIboVVigez";
var untagged_total = 0;


/**
 A function for getting query string values.  Based on an answer by
 BrunoLM on Stack Overflow: http://stackoverflow.com/a/3855394/1558022
 In addition to his code, this strips trailing slashing from the
 query values.
 */
var queryParams = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " ")).replace(/\//g, "");
    }
    return b;
})(window.location.search.substr(1).split('&'));


/**
 * A function that normalises a URL into a hostname to be supplied to
 * the Tumblr API.
 */
var normalise_url = function(url) {
    // First strip any http:// or https:// prefix
    url = url.replace(/^http[s]{0,}:\/\//g, "");

    // Then remove any trailing slashes
    url = url.replace(/\/$/g, "");

    return url
}


var API_URL = "http://api.tumblr.com/v2/blog/" + normalise_url(queryParams["hostname"]) + "/posts";


/**
 * Create the function is_untagged() which determines whether a post is
 * eligible for display in the main list.  The function is defined based
 * on the query parameters, rather than a single definition that uses
 * lots of branches -- this is probably much faster in the long run.
 */
if (queryParams["include_reblogs"]) {

    // If we're including all posts and reblogs, then we just have to
    // look at the length of the tags attribute
    var is_untagged = function(post) {
        return !post.tags.length;
    }

} else {

    // If we're including all posts, but not reblogs, then we look at
    // the length of the tags attribute, and whether the post has an
    // attribute that only appears on reblogs
    var is_untagged = function(post) {
        return (!post.tags.length) && (!post.hasOwnProperty("reblogged_root_id"));
    }

}


/**
 A function that constructs a string which explains to the user
 what inputs the site is using.  For example:

 > Getting untagged posts for *staff.tumblr.com* which *exclude*
 > reblogs and only includes photo posts.

 Returns a string.
 */
var optionString = function(hostname, include_reblogs, post_type) {
    var optString = "Getting untagged posts for <span class=\"option\">" + hostname + "</span> which ";

    optString += "<span class=\"option\">";
    if (include_reblogs) optString += "include";
    else optString += "exclude";
    optString += "</span> reblogs";

    if (post_type == "all") return (optString + ".");

    optString += " and only includes <span class=\"option\">";
    switch(post_type) {
        case "text":
        case "photo":
        case "link":
        case "chat":
        case "audio":
        case "answer":
            optString += post_type + " posts"
            break;
        case "quote":
        case "video":
            optString += post_type + "s";
            break;
    }
    return (optString + "</span>.");
}


/**
 * Make a request to the Tumblr API.
 * @param: offset     How many posts have been retrieved so far
 * @param: total      The total number of posts to retrieve (if known)
 * @param: post_type  Based on the user's choices in the first form
 * @param: success_callback  Callback to run when the request is complete
 */
var makeRequest = function(offset, total, post_type, success_callback) {
    var tmpData = {
        "reblog_info": "true",
        "api_key": API_KEY,
    };

    if (offset > 0) { tmpData["offset"] = offset; }
    if (post_type != "all") { tmpData["type"] = post_type; }

    $.ajax({
        url: API_URL,
        data: tmpData,

        // The name of the callback parameter
        callback: "JSON_CALLBACK",

        // Tell jQuery we're expecting JSONP
        dataType: "jsonp",

        success: function(response) { success_callback(response, offset, total, post_type); }
    })
}


/**
 * After retrieving a batch of posts from the API, this function
 * goes through them and:
 *  - Adds any untagged posts to the list
 *  - Updates the various status indicators with the new information
 *  - Spawns the next batch of posts from the API (if there are any left)
 */
var update_page = function(response, offset, total, post_type) {
    for (var i in response.response.posts) {
        var post = response.response.posts[i];
        if (is_untagged(post)) {
            untagged_total += 1;
            document.getElementById("posts").innerHTML += ("<li><a href=\"" + post.post_url + "\">" + post.post_url + "</a></li>");
        }
    }

    document.getElementById("untagged_total").innerHTML = untagged_total;
    if (offset < total) {
        document.getElementById("offset").innerHTML = offset;
        getPosts(offset + 20, total, post_type);
    } else {
        document.getElementById("first_response").innerHTML = "";
        document.getElementById("status").innerHTML = "<p>I’ve finished looking, and I found " + untagged_total + " untagged posts.</p>";
    }
}


/**
 * This function is just a wrapper than gets the next batch of posts from the API
 */
var getPosts = function(offset, total, post_type) {
    makeRequest(offset, total, post_type, update_page);
}


/**
 * This function gets the initial response from the Tumblr API, including
 * the total number of posts to examine, and then sets up the appropriate
 * status indicators.
 * TODO: improve the error handling.
 */
var initial_success = function(response, offset, total, post_type) {
    if (response.meta.status === 200) {
        document.getElementById("first_response").innerHTML = ("<p>I found your blog! Searching for untagged posts:");

        var statusstring = "<p>Looked through <span id=\"offset\">0</span> of " + response.response.total_posts + " total post";
        if (response.response.total_posts != 1) { statusstring += "s"; }
        statusstring += ": (found <span id=\"untagged_total\">0</span> untagged posts)</p>";

        document.getElementById("status").innerHTML = statusstring;
        getPosts(0, response.response.total_posts, post_type);
    } else {
        document.getElementById("first_response").innerHTML = ("<p>I tried to look up your </p>");
    }
}