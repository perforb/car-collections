<template>
  <div class="upload">
    <h1>File Upload</h1>
    <div>
      <form>
        <input type="file" @change="onFileSelected">
        <button @click.prevent="onUpload">Upload</button>
      </form>
      <div class="progress">
        <p>upload progress</p>
        <p>{{ uploadProgress }}</p>
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
  name: 'FileUploadForm',
  data () {
    return {
      selectedFile: null,
      uploadProgress: '0%'
    }
  },
  methods: {
    onFileSelected (event) {
      this.selectedFile = event.target.files[0]
    },
    onUpload () {
      const fd = new FormData()
      fd.append('file', this.selectedFile, this.selectedFile.name)
      instance
        .post('/upload', fd, {
          onUploadProgress: uploadEvent => {
            const progress =
              Math.round(uploadEvent.loaded / uploadEvent.total * 100) + '%'
            this.uploadProgress = progress
          }
        })
        .then(res => {
          this.uploadProgress = 'upload completed'
        })
        .catch(err => {
          console.error(err)
          this.uploadProgress = 'upload error'
        })
    }
  }
}
</script>
