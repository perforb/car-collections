<template>
  <div id="app">
    <img src="./assets/logo.png" width="300">
    <router-view/>
    <script src="https://www.gstatic.com/firebasejs/5.4.1/firebase.js"></script>
    <script src="https://www.gstatic.com/firebasejs/5.0.4/firebase-firestore.js"></script>
    <script>
      // Initialize Firebase
      var config = {
        apiKey: "AIzaSyBmydCWq_EWTqTxAkQbyNOiIpTd9GMTDdA",
        authDomain: "car-collections.firebaseapp.com",
        databaseURL: "https://car-collections.firebaseio.com",
        projectId: "car-collections",
        storageBucket: "car-collections.appspot.com",
        messagingSenderId: "178184142998"
      };
      firebase.initializeApp(config);
    </script>
</div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
