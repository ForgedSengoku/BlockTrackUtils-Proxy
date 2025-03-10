# BlockTrackUtils

BlockTrackUtils is a tool designed to help you track player bans and view their previous usernames on the BlocksMC server.

## 🚀 Why the Second Version?

We originally developed an **Electron app** for tracking bans inside Minecraft. However, we have now moved to a **Minecraft proxy-based system** that allows players to join BlocksMC and check bans more efficiently. 

💡 The **Electron app is NOT discontinued**—it will continue receiving updates due to its user-friendly interface and easy management!

---

## 🌟 Features

✅ **Track Bans** – Instantly check why a player was banned.  
✅ **Previous Usernames** – View a list of past usernames associated with a player.  
✅ **Standalone Proxy** – Join using the proxy and check ban statuses in real time.  

---

## 📥 Setup Guide

Follow these steps to install and run BlockTrackUtils:

### 1️⃣ Install Node.js
Make sure you have the **LTS (Long-Term Support) version of Node.js** installed. You can download it from [nodejs.org](https://nodejs.org/).

### 2️⃣ Extract Files
Download and extract the BlockTrackUtils source files.

### 3️⃣ Install Dependencies
Open a terminal or command prompt, navigate to the project folder, and run:
```sh
npm install
```
This will install all necessary dependencies.

### 4️⃣ Start the Proxy Server
Run the following command to start the server:
```sh
node server.js
```

### 5️⃣ Connect in Minecraft
Open a **Minecraft 1.8.9** client and join the server using:
```
localhost:25565
```
You can change the port in the configuration if needed.

---

## 🎮 Commands

| Command | Description |
|---------|-------------|
| **/prv** | Displays the list of previously checked usernames. |
| **/check <PlayerUsername>** | Checks the ban status of a player. |
| **/eraseusernames** | Clears the stored usernames to free up space. |
| **/faq** | Explains why some accounts cannot be checked. |
| **/help** | Displays a list of available commands. |

---

## ⚠️ **Warning: Stability Issues**

🔴 **BlockTrackUtils is not as stable as the Electron app**. Since it relies on `basic-minecraft-proxy`, there are known issues:

- 🛑 **Server Connection Problems** – Players sometimes get kicked without proper error messages.
- 🔒 **Premium Account Support** – Not yet implemented (but can be added easily).

We are actively working on fixing these issues to improve performance! 💪

---

## ❤️ Support & Contributions

Feel free to **open an issue** if you encounter bugs or have suggestions. Contributions are welcome! 🎉

**Enjoy using BlockTrackUtils!** 🚀
