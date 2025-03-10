
# BlockTrackUtils 

BlockTrackUtils is a tool designed to help you track player bans and view their previous usernames.

##Why second?
We done electron app but we moved from inside of Minecraft to join BlocksMC and be able to check bans the electron app is not discontinued and will get updates still due to its design and easy management 
## Features

- **Track Bans**: Check the reason why a player was banned.
- **Previous Usernames**: View a list of previous usernames associated with a player.

## Setup

1. **Install Node.js**: Download and install the LTS (Long Term Support) version of Node.js from [nodejs.org](https://nodejs.org/).
2. **Decompile**: Decompile or extract the source files of BlockTrackUtils.
3. **Install Dependencies**: Open your terminal or command prompt, navigate to the project folder, and run `npm install` to install the required dependencies.
4. **Start the Server**: Run `node server.js` to start the server.
5. **Access the Tool**: Then open a minecraft client supported in 1.8.9 and join on `localhost:3000`. You can modify the port if you prefer a different one.

## Commands

- **/prv**: Displays the list of previously checked usernames.
- **/check <PlayerUsername>**: Checks the ban status of a player by their username.
- **/eraseusernames**: Cleans up the list of old usernames to free up storage space.

Enjoy using BlockTrackUtils!

