import Vue from 'vue'
import Router from 'vue-router'
import Index from '@/components/Index'
import FileUpload from '@/components/FileUpload'

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
      name: 'FileUpload',
      component: FileUpload
    }
  ]
})
