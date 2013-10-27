/**
 * Portable utilities for IRC.
 */

var IrcUtils = {
    /**
     * Get a new version of a nick list, sorted alphabetically by lowercase nick.
     *
     * @param nickList Original nick list
     * @return Nick list sorted alphabetically by lowercase nick
     */
    _ciSearchNickList: function(nickList) {
        var newList = [];

        nickList.forEach(function(nick) {
            newList.push(nick);
        });
        newList.sort(function(a, b) {
            return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
        });

        return newList;
    },

    /**
     * Completes a single word.
     *
     * @param candidate What to search for
     * @param wordList Array of words sorted for case insensitive searching
     * @return Completed word (null if not found)
     */
    _completeSingleWord: function(candidate, wordList) {
        var foundWord = null;

        wordList.some(function(word) {
            if (word.toLowerCase().search(candidate.toLowerCase()) == 0) {
                // found!
                foundWord = word;
                return true;
            }
            return false;
        });

        return foundWord;
    },

    /**
     * Get the next word when iterating words.
     *
     * @param iterCandidate First characters to look at (search criteria)
     * @param currentWord Current selected word
     * @param wordList Array of words sorted for case insensitive searching
     * @return Next word (may be the same)
     */
    _nextWord: function(iterCandidate, currentWord, wordList) {
        var firstInGroup = null;
        var matchingWords = [];
        var at = null;
        var lcIterCandidate = iterCandidate.toLowerCase();
        var lcCurrentWord = currentWord.toLowerCase();

        // collect matching words
        for (var i = 0; i < wordList.length; ++i) {
            var lcWord = wordList[i].toLowerCase();
            if (lcWord.search(lcIterCandidate) == 0) {
                matchingWords.push(wordList[i]);
                if (lcCurrentWord == lcWord) {
                    at = matchingWords.length - 1;
                }
            } else if (matchingWords.length > 0) {
                // end of group, no need to check after this
                break;
            }
        }

        if (at == null || matchingWords.length == 0) {
            return currentWord;
        } else {
            ++at;
            if (at == matchingWords.length) {
                // cycle
                at = 0;
            }
            return matchingWords[at];
        }
    },

    /**
     * Nick completion.
     *
     * @param text Plain text (no colors)
     * @param caretPos Current caret position (0 means before the first character)
     * @param iterCandidate Current iteration candidate (null if not iterating)
     * @param nickList Array of current nicks
     * @param suf Custom suffix (at least one character, escaped for regex)
     * @return Object with following properties:
     *      text: new complete replacement text
     *      caretPos: new caret position within new text
     *      foundNick: completed nick (or null if not possible)
     *      iterCandidate: current iterating candidate
     */
    completeNick: function(text, caretPos, iterCandidate, nickList, suf) {
        var doIterate = (iterCandidate !== null);
        if (suf === null) {
            suf = ':';
        }

        // new nick list to search in
        var searchNickList = IrcUtils._ciSearchNickList(nickList);

        // text before and after caret
        var beforeCaret = text.substring(0, caretPos);
        var afterCaret = text.substring(caretPos);

        // default: don't change anything
        var ret = {
            text: text,
            caretPos: caretPos,
            foundNick: null,
            iterCandidate: null
        };

        // iterating nicks at the beginning?
        var m = beforeCaret.match(new RegExp('^([a-zA-Z0-9_\\\\\\[\\]{}^`|-]+)' + suf + ' $'));
        if (m) {
            if (doIterate) {
                // try iterating
                var newNick = IrcUtils._nextWord(iterCandidate, m[1], searchNickList);
                beforeCaret = newNick + suf + ' ';
                return {
                    text: beforeCaret + afterCaret,
                    caretPos: beforeCaret.length,
                    foundNick: newNick,
                    iterCandidate: iterCandidate
                };
            } else {
                // if not iterating, don't do anything
                return ret;
            }
        }

        // nick completion in the beginning?
        m = beforeCaret.match(/^([a-zA-Z0-9_\\\[\]{}^`|-]+)$/);
        if (m) {
            // try completing
            var newNick = IrcUtils._completeSingleWord(m[1], searchNickList);
            if (newNick === null) {
                // no match
                return ret;
            }
            beforeCaret = newNick + suf + ' ';
            if (afterCaret[0] == ' ') {
                // swallow first space after caret if any
                afterCaret = afterCaret.substring(1);
            }
            return {
                text: beforeCaret + afterCaret,
                caretPos: beforeCaret.length,
                foundNick: newNick,
                iterCandidate: m[1]
            };
        }

        // iterating nicks in the middle?
        m = beforeCaret.match(/^(.* )([a-zA-Z0-9_\\\[\]{}^`|-]+) $/);
        if (m) {
            if (doIterate) {
                // try iterating
                var newNick = IrcUtils._nextWord(iterCandidate, m[2], searchNickList);
                beforeCaret = m[1] + newNick + ' ';
                return {
                    text: beforeCaret + afterCaret,
                    caretPos: beforeCaret.length,
                    foundNick: newNick,
                    iterCandidate: iterCandidate
                };
            } else {
                // if not iterating, don't do anything
                return ret;
            }
        }

        // nick completion elsewhere in the middle?
        m = beforeCaret.match(/^(.* )([a-zA-Z0-9_\\\[\]{}^`|-]+)$/);
        if (m) {
            // try completing
            var newNick = IrcUtils._completeSingleWord(m[2], searchNickList);
            if (newNick === null) {
                // no match
                return ret;
            }
            beforeCaret = m[1] + newNick + ' ';
            if (afterCaret[0] == ' ') {
                // swallow first space after caret if any
                afterCaret = afterCaret.substring(1);
            }
            return {
                text: beforeCaret + afterCaret,
                caretPos: beforeCaret.length,
                foundNick: newNick,
                iterCandidate: m[2]
            };
        }

        // completion not possible
        return ret;
    },

    _ircCommands: [
        'ADMIN',
        'AWAY',
        'CNOTICE',
        'CPRIVMSG',
        'CONNECT',
        'DIE',
        'ENCAP',
        'ERROR',
        'HELP',
        'INFO',
        'INVITE',
        'ISON',
        'JOIN',
        'KICK',
        'KILL',
        'KNOCK',
        'LINKS',
        'LIST',
        'LUSERS',
        'MODE',
        'MOTD',
        'NAMES',
        'NAMESX',
        'NICK',
        'NOTICE',
        'OPER',
        'PART',
        'PASS',
        'PING',
        'PONG',
        'PRIVMSG',
        'QUIT',
        'REHASH',
        'RESTART',
        'RULES',
        'SERVER',
        'SERVICE',
        'SERVLIST',
        'SQUERY',
        'SQUIT',
        'SETNAME',
        'SILENCE',
        'STATS',
        'SUMMON',
        'TIME',
        'TOPIC',
        'TRACE',
        'UHNAMES',
        'USER',
        'USERHOST',
        'USERIP',
        'USERS',
        'VERSION',
        'WALLOPS',
        'WATCH',
        'WHO',
        'WHOIS',
        'WHOWAS'
    ],

    /**
     * IRC command completion.
     *
     * @param text Plain text
     * @param caretPos Current caret position (0 means before the first character)
     * @param iterCandidate Current iteration candidate (null if not iterating)
     * @return Object with following properties:
     *      text: new complete replacement text
     *      caretPos: new caret position within new text
     *      foundCmd: completed command (or null if not possible)
     *      iterCandidate: current iterating candidate
     */
    completeCmd: function(text, caretPos, iterCandidate) {
        var beforeCaret = text.substring(0, caretPos);
        var afterCaret = text.substring(caretPos);
        var doIterate = (iterCandidate !== null);
        var ret = {
            text: text,
            caretPos: caretPos,
            foundCmd: null,
            iterCandidate: iterCandidate
        };

        // iteration?
        var m = beforeCaret.match(/^\/([a-zA-Z]+) $/);
        if (m) {
            if (doIterate) {
                var cmd = IrcUtils._nextWord(iterCandidate, m[1], IrcUtils._ircCommands);
                beforeCaret = '/' + cmd + ' ';
                return {
                    text: beforeCaret + afterCaret,
                    caretPos: beforeCaret.length,
                    foundCmd: cmd,
                    iterCandidate: iterCandidate
                };
            } else {
                return ret;
            }
        }

        // command completion?
        var m = beforeCaret.match(/^\/([a-zA-Z]+)$/);
        if (m) {
            var cmd = IrcUtils._completeSingleWord(m[1], IrcUtils._ircCommands);
            if (cmd === null) {
                return ret;
            }
            beforeCaret = '/' + cmd + ' ';
            if (afterCaret[0] == ' ') {
                afterCaret = afterCaret.substring(1);
            }
            return {
                text: beforeCaret,
                caretPos: beforeCaret.length,
                foundCmd: cmd,
                iterCandidate: m[1]
            };
        }

        // not found
        return {
            text: text,
            caretPos: caretPos,
            foundCmd: null
        };
    }
};
