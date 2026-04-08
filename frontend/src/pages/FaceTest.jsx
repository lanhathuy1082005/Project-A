import * as faceapi from 'face-api.js'
import { useRef, useEffect, useState } from 'react'

export default function FaceTest() {
  const imgRef = useRef(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      console.log('model loaded:', faceapi.nets.tinyFaceDetector.isLoaded)
      setModelsLoaded(true)
    }
    loadModels()
  }, [])

    useEffect(() => {
    if (!modelsLoaded || !imgRef.current) return

    const run = async () => {
    console.log('running detection...')
    const detection = await faceapi.detectSingleFace(
      imgRef.current,
      new faceapi.TinyFaceDetectorOptions()
    )
    console.log('result:', detection)
    setResult(detection ? 'Face detected ✅' : 'No face found ❌')
  }

  run()
}, [modelsLoaded])


  return (
    <>
      <img ref={imgRef} src="/0625c0ff-57da-4688-ab42-fe9c58d1e88f.jpg" />
      <p>{result}</p>
    </>
  )
}