<template>
  <div class="main">
    <h1>{{ title }}</h1>
    <a v-bind:href="link">new</a>
  </div>
</template>

<script>
export default {
  name: 'Main',
  data () {
    return {
      title: 'Car pictures',
      link: '/#/form'
    }
  }
}
</script>
