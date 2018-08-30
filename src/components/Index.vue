<template>
  <div>
    <h1>{{ title }}</h1>
    <a v-bind:href="link">add</a>
    <div v-for="car in cars" :key="car.id">
      <p class="car-list__header">{{ car.name }}</p>
      <img v-bind:src="car.url" width="150" />
    </div>
  </div>
</template>

<script>
import db from './firebaseInit'

export default {
  name: 'Main',
  data () {
    return {
      title: 'Car pictures',
      link: '/#/add',
      loading: true,
      cars: []
    }
  },
  created () {
    db.collection('cars').get().then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = {
          'id': doc.id,
          'path': doc.data().path,
          'name': doc.data().name,
          'url': doc.data().url,
          'timestamp': doc.data().timestamp
        }
        this.cars.push(data)
      })
    })
  }
}
</script>

<style lang="scss" scoped>
  h1 {
    font-size: 30px;
    margin: 30px 0;
  }
  .car-list {
    margin-top: 30px;
    background-color: white;
    padding: 20px;
    box-shadow: 0 0 5px 0 rgba(0,0,0,0.05);
    .column {
      height: 95px;
    }
    .inner {
      .left {
        width: 50%;
        float: left;
        text-align: left;
      }
      .right {
        width: 50%;
        float: left;
        text-align: left;
        p {
          width: 100%;
          text-align: left;
        }
      }
    }
    .right {
      display: flex;
      align-items: center;
      justify-content: center;
      button {
        background: #4B75FF;
      }
    }
    .car-list__header {
      font-size: 20px;
      font-weight: 700;
    }
    .car-list__sub {
      font-size: 15px;
      margin-top: 10px;
    }
  }
  @keyframes placeHolderShimmer{
    0%{
      background-position: -468px 0
    }
    100%{
      background-position: 468px 0
    }
  }
  .animated-background__header {
    -webkit-animation-duration: 1s;
    animation-duration: 1s;
    -webkit-animation-fill-mode: forwards;
    animation-fill-mode: forwards;
    -webkit-animation-iteration-count: infinite;
    animation-iteration-count: infinite;
    -webkit-animation-name: placeHolderShimmer;
    animation-name: placeHolderShimmer;
    -webkit-animation-timing-function: linear;
    animation-timing-function: linear;
    background: #f6f7f8;
    background: #eeeeee;
    background: -webkit-gradient(linear, left top, right top, color-stop(8%, #eeeeee), color-stop(18%, #dddddd), color-stop(33%, #eeeeee));
    background: -webkit-linear-gradient(left, #eeeeee 8%, #dddddd 18%, #eeeeee 33%);
    background: linear-gradient(to right, #eeeeee 8%, #dddddd 18%, #eeeeee 33%);
    -webkit-background-size: 800px 104px;
    background-size: 800px 104px;
    height: 20px;
    width: 400px;
    position: relative;
  }
  .animated-background__sub {
    -webkit-animation-duration: 1s;
    animation-duration: 1s;
    -webkit-animation-fill-mode: forwards;
    animation-fill-mode: forwards;
    -webkit-animation-iteration-count: infinite;
    animation-iteration-count: infinite;
    -webkit-animation-name: placeHolderShimmer;
    animation-name: placeHolderShimmer;
    -webkit-animation-timing-function: linear;
    animation-timing-function: linear;
    background: #f6f7f8;
    background: #eeeeee;
    background: -webkit-gradient(linear, left top, right top, color-stop(8%, #eeeeee), color-stop(18%, #dddddd), color-stop(33%, #eeeeee));
    background: -webkit-linear-gradient(left, #eeeeee 8%, #dddddd 18%, #eeeeee 33%);
    background: linear-gradient(to right, #eeeeee 8%, #dddddd 18%, #eeeeee 33%);
    -webkit-background-size: 800px 104px;
    background-size: 800px 104px;
    height: 20px;
    width: 200px;
    position: relative;
  }
</style>
