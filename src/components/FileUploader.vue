<template>
  <div class="upload">
    <h1>Upload your car picture!</h1>
    <div>
      <form>
        <input type="file" @change="onFileSelected">
        <button @click.prevent="onUpload">Upload</button>
      </form>
      <div class="progress">
        <p>Progress:</p>
        <p>{{ progress }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const instance = axios.create({
  baseURL: process.env.SITE_URL,
  timeout: 10000
})

export default {
  name: 'FileUploader',
  data () {
    return {
      selectedFile: null,
      progress: '0%'
    }
  },
  methods: {
    onFileSelected (event) {
      this.selectedFile = event.target.files[0]
    },
    onUpload () {
      const form = new FormData()
      form.append('file', this.selectedFile, this.selectedFile.name)
      instance
        .post('/upload', form, {
          onUploadProgress: event => {
            this.progress = Math.round(event.loaded / event.total * 100) + '%'
          }
        })
        .then(res => {
          this.progress = 'Completed!'
        })
        .catch(err => {
          console.error(err)
          this.progress = 'Failed to upload your file.'
        })
    }
  }
}
</script>
