import Vue from 'vue'
import Router from 'vue-router'
import Index from '@/components/Index'
import FileUploader from '@/components/FileUploader'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Index',
      component: Index
    },
    {
      path: '/form',
      name: 'FileUploader',
      component: FileUploader
    }
  ]
})
