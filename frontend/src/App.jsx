import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Stage, Layer, Rect, Circle, Line, Text, Image as KImage, Transformer } from 'react-konva'

const CANVAS_W = 1000
const CANVAS_H = 700

function EditableImage({ node, isSelected, onSelect, onChange }) {
  const shapeRef = useRef()
  const trRef = useRef()
  const [img, setImg] = useState(null)

  useEffect(() => {
    if (node.props.src && !node.props.image) {
      const i = new window.Image()
      i.crossOrigin = 'anonymous'
      i.src = node.props.src
      i.onload = () => setImg(i)
    } else if (node.props.image) {
      setImg(node.props.image)
    }
  }, [node.props.src, node.props.image])

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [isSelected])

  useEffect(() => {
    if (shapeRef.current) {
      shapeRef.current.cache()
      shapeRef.current.getLayer()?.batchDraw()
    }
  }, [node.props.brightness, node.props.contrast, node.props.opacity])

  return <>
    <KImage
      ref={shapeRef}
      x={node.x}
      y={node.y}
      image={img}
      width={node.props.width}
      height={node.props.height}
      draggable
      opacity={node.props.opacity ?? 1}
      filters={[window.Konva.Filters.Brighten, window.Konva.Filters.Contrast]}
      brightness={node.props.brightness ?? 0}
      contrast={node.props.contrast ?? 0}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={e => onChange({ ...node, x: e.target.x(), y: e.target.y() })}
      onTransformEnd={e => {
        const nodeRef = shapeRef.current
        const scaleX = nodeRef.scaleX()
        const scaleY = nodeRef.scaleY()
        const newNode = {
          ...node,
          x: nodeRef.x(),
          y: nodeRef.y(),
          props: {
            ...node.props,
            width: Math.max(10, nodeRef.width() * scaleX),
            height: Math.max(10, nodeRef.height() * scaleY),
            image: img
          }
        }
        nodeRef.scaleX(1)
        nodeRef.scaleY(1)
        onChange(newNode)
      }}
    />
    {isSelected && <Transformer ref={trRef} rotateEnabled={true} keepRatio={false} />}
  </>
}

export default function App() {
  const stageRef = useRef()
  const layerRef = useRef()
  const [bg, setBg] = useState('#ffffff')
  const [nodes, setNodes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId), [nodes, selectedId])
  const [brief, setBrief] = useState('Product promo: bold headline, dark background, neon accent')

  const addText = () => {
    setNodes(prev => [...prev, { id: `t-${Date.now()}`, type: 'text', x: 60, y: 60, props: { text: 'New Text', fontSize: 32, fill: '#111', opacity: 1 } }])
  }
  const addRect = () => setNodes(prev => [...prev, { id:`r-${Date.now()}`, type:'rect', x:120, y:120, props:{ width:240, height:140, fill:'#e0e0e0', stroke:'#333', strokeWidth:2, opacity:1 } }])
  const addCircle = () => setNodes(prev => [...prev, { id:`c-${Date.now()}`, type:'circle', x:320, y:240, props:{ radius:80, fill:'#ffd54f', stroke:'#333', strokeWidth:2, opacity:1 } }])
  const addLine = () => setNodes(prev => [...prev, { id:`l-${Date.now()}`, type:'line', x:140, y:360, props:{ points:[0,0,240,0], stroke:'#333', strokeWidth:4, opacity:1 } }])

  const addAIImage = async () => {
    const p = window.prompt('Describe the image you want:', 'neon abstract background')
    if (!p) return
    try {
      const { data } = await axios.post('http://localhost:4000/api/image', { prompt: p, size: '512x512' })
      setNodes(prev => [...prev, { id:`i-${Date.now()}`, type:'image', x:180, y:160, props:{ src: data.url, width: 420, height: 300, opacity: 1, brightness: 0, contrast: 0 } }])
    } catch {
      alert('Image generation failed')
    }
  }

  const uploadLocalImage = (file) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new window.Image()
      img.src = e.target.result
      img.onload = () => {
        const maxW = 700, maxH = 500
        const ratio = Math.min(1, maxW / img.width, maxH / img.height)
        setNodes(prev => [...prev, { id:`i-${Date.now()}`, type:'image', x:160, y:140, props:{ image: img, width: img.width*ratio, height: img.height*ratio, opacity: 1, brightness: 0, contrast: 0 } }])
      }
    }
    reader.readAsDataURL(file)
  }

  const onNodeChange = (updated) => setNodes(prev => prev.map(n => n.id === updated.id ? updated : n))
  const deleteSelected = () => { if (!selectedId) return; setNodes(prev => prev.filter(n => n.id !== selectedId)); setSelectedId(null) }

  const exportPNG = () => {
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
    const a = document.createElement('a'); a.href = uri; a.download = 'design.png'; a.click()
  }

  const useAgent = async () => {
    if (!brief) return
    try {
      const { data } = await axios.post('http://localhost:4000/api/agent', { brief })
      const plan = data?.plan || {}
      setBg(plan.background || '#ffffff')
      const assembled = []
      for (const item of (plan.layers || [])) {
        if (item.type === 'text') {
          assembled.push({ id:item.id||`t-${Date.now()}`, type:'text', x:item.x??60, y:item.y??60, props:{ text:item.text||'Title', fontSize:item.fontSize||42, fill:item.color||'#111', opacity:1 } })
        } else if (item.type === 'image') {
          if (item.prompt) {
            try {
              const { data: imgResp } = await axios.post('http://localhost:4000/api/image', { prompt: item.prompt, size: '512x512' })
              assembled.push({ id:item.id||`i-${Date.now()}`, type:'image', x:item.x??120, y:item.y??120, props:{ src: imgResp.url, width:item.width||420, height:item.height||280, opacity:1, brightness:0, contrast:0 } })
            } catch {}
          }
        }
      }
      setNodes(assembled)
    } catch { alert('Agent failed') }
  }

  const Controls = () => {
    if (!selectedNode) return <p style={{fontSize:12,color:'#666'}}>Select an element to edit its properties.</p>
    const { type, props } = selectedNode
    const updateProps = (patch) => onNodeChange({ ...selectedNode, props: { ...props, ...patch } })
    return <div>
      <div style={{fontWeight:600, marginBottom:6}}>Selected: {type}</div>
      <label style={{display:'block', fontSize:12}}>Opacity: {props.opacity ?? 1}</label>
      <input type="range" min="0" max="1" step="0.01" value={props.opacity ?? 1} onChange={e => updateProps({ opacity: parseFloat(e.target.value) })} style={{width:'100%', marginBottom:8}}/>
      {type === 'text' && <>
        <label style={{display:'block', fontSize:12}}>Text</label>
        <textarea rows={3} value={props.text} onChange={e => updateProps({ text: e.target.value })} style={{width:'100%', marginBottom:8}} />
        <label style={{display:'block', fontSize:12}}>Font size: {props.fontSize}</label>
        <input type="range" min="10" max="120" step="1" value={props.fontSize} onChange={e => updateProps({ fontSize: parseInt(e.target.value) })} style={{width:'100%', marginBottom:8}}/>
        <label style={{display:'block', fontSize:12}}>Color</label>
        <input type="color" value={props.fill} onChange={e => updateProps({ fill: e.target.value })} />
      </>}
      {type === 'rect' && <>
        <label style={{display:'block', fontSize:12}}>Fill</label>
        <input type="color" value={props.fill} onChange={e => updateProps({ fill: e.target.value })} />
        <label style={{display:'block', fontSize:12}}>Stroke</label>
        <input type="color" value={props.stroke} onChange={e => updateProps({ stroke: e.target.value })} />
        <label style={{display:'block', fontSize:12}}>Stroke Width: {props.strokeWidth}</label>
        <input type="range" min="0" max="20" step="1" value={props.strokeWidth} onChange={e => updateProps({ strokeWidth: parseInt(e.target.value) })} style={{width:'100%', marginBottom:8}}/>
      </>}
      {type === 'circle' && <>
        <label style={{display:'block', fontSize:12}}>Fill</label>
        <input type="color" value={props.fill} onChange={e => updateProps({ fill: e.target.value })} />
        <label style={{display:'block', fontSize:12}}>Radius: {props.radius}</label>
        <input type="range" min="10" max="300" step="1" value={props.radius} onChange={e => updateProps({ radius: parseInt(e.target.value) })} style={{width:'100%', marginBottom:8}}/>
      </>}
      {type === 'line' && <>
        <label style={{display:'block', fontSize:12}}>Stroke</label>
        <input type="color" value={props.stroke} onChange={e => updateProps({ stroke: e.target.value })} />
        <label style={{display:'block', fontSize:12}}>Stroke Width: {props.strokeWidth}</label>
        <input type="range" min="1" max="30" step="1" value={props.strokeWidth} onChange={e => updateProps({ strokeWidth: parseInt(e.target.value) })} style={{width:'100%', marginBottom:8}}/>
      </>}
      {type === 'image' && <>
        <div style={{fontWeight:600, marginTop:10}}>Image Filters</div>
        <label style={{display:'block', fontSize:12}}>Brightness: {props.brightness ?? 0}</label>
        <input type="range" min="-1" max="1" step="0.01" value={props.brightness ?? 0} onChange={e => updateProps({ brightness: parseFloat(e.target.value) })} style={{width:'100%', marginBottom:8}}/>
        <label style={{display:'block', fontSize:12}}>Contrast: {props.contrast ?? 0}</label>
        <input type="range" min="-100" max="100" step="1" value={props.contrast ?? 0} onChange={e => updateProps({ contrast: parseInt(e.target.value) })} style={{width:'100%', marginBottom:8}}/>
      </>}
      <button onClick={deleteSelected} style={{width:'100%', marginTop:8}}>Delete</button>
    </div>
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: 300, padding: 12, borderRight: '1px solid #ddd', boxSizing:'border-box' }}>
        <h3 style={{ margin: '6px 0' }}>Mini Canva v2</h3>
        <label style={{ fontSize: 12, color: '#555' }}>Brief</label>
        <textarea rows={5} value={brief} onChange={e=>setBrief(e.target.value)} style={{width:'100%', boxSizing:'border-box'}} />
        <button onClick={useAgent} style={{width:'100%', marginTop:6}}>Generate Layout (Agent)</button>
        <hr />
        <button onClick={addText} style={{width:'100%'}}>Add Text</button>
        <button onClick={addRect} style={{width:'100%', marginTop:6}}>Add Rectangle</button>
        <button onClick={addCircle} style={{width:'100%', marginTop:6}}>Add Circle</button>
        <button onClick={addLine} style={{width:'100%', marginTop:6}}>Add Line</button>
        <button onClick={addAIImage} style={{width:'100%', marginTop:6}}>AI Image</button>
        <label style={{display:'block', marginTop:8, fontSize:12}}>Upload Image</label>
        <input type="file" accept="image/*" onChange={e => e.target.files && uploadLocalImage(e.target.files[0])} />
        <hr />
        <label style={{display:'block', fontSize:12}}>Canvas Background</label>
        <input type="color" value={bg} onChange={e=>setBg(e.target.value)} />
        <hr />
        <Controls />
        <hr />
        <button onClick={exportPNG} style={{width:'100%'}}>Export PNG</button>
      </div>

      <div style={{ flex: 1 }} onMouseDown={()=>setSelectedId(null)}>
        <Stage ref={stageRef} width={CANVAS_W} height={CANVAS_H} style={{ background: bg }}>
          <Layer ref={layerRef}>
            <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill={bg} listening={false} />
            {nodes.map(n => {
              const common = {
                key: n.id, x: n.x, y: n.y, draggable: true,
                opacity: n.props.opacity ?? 1,
                onClick: e => { e.cancelBubble = true; setSelectedId(n.id) },
                onTap: e => { e.cancelBubble = true; setSelectedId(n.id) },
                onDragEnd: e => setNodes(prev => prev.map(p => p.id===n.id ? { ...p, x:e.target.x(), y:e.target.y() } : p))
              }

              if (n.type === 'text') {
                return <>
                  <Text {...common} text={n.props.text} fontSize={n.props.fontSize} fill={n.props.fill} />
                  {selectedId===n.id && <Transformer nodes={[layerRef.current.findOne(node => node.getClassName && node.getClassName()==='Text' && node.x()===n.x && node.y()===n.y)]} />}
                </>
              }
              if (n.type === 'rect') {
                return <>
                  <Rect {...common}
                    width={n.props.width} height={n.props.height}
                    fill={n.props.fill} stroke={n.props.stroke} strokeWidth={n.props.strokeWidth}
                    onTransformEnd={e => {
                      const shape = e.target
                      const sx = shape.scaleX(), sy = shape.scaleY()
                      setNodes(prev => prev.map(p => p.id===n.id ? { ...p, x: shape.x(), y: shape.y(), props:{ ...p.props, width: Math.max(5, shape.width()*sx), height: Math.max(5, shape.height()*sy) } } : p))
                      shape.scaleX(1); shape.scaleY(1)
                    }}
                  />
                  {selectedId===n.id && <Transformer nodes={[layerRef.current.findOne(node => node.getClassName && node.getClassName()==='Rect' && node.x()===n.x && node.y()===n.y)]} />}
                </>
              }
              if (n.type === 'circle') {
                return <>
                  <Circle {...common}
                    radius={n.props.radius} fill={n.props.fill} stroke={n.props.stroke} strokeWidth={n.props.strokeWidth}
                    onTransformEnd={e => {
                      const shape = e.target
                      const sx = shape.scaleX()
                      setNodes(prev => prev.map(p => p.id===n.id ? { ...p, x: shape.x(), y: shape.y(), props:{ ...p.props, radius: Math.max(5, shape.radius()*sx) } } : p))
                      shape.scaleX(1); shape.scaleY(1)
                    }}
                  />
                  {selectedId===n.id && <Transformer nodes={[layerRef.current.findOne(node => node.getClassName && node.getClassName()==='Circle' && node.x()===n.x && node.y()===n.y)]} enabledAnchors={['top-left','top-right','bottom-left','bottom-right']} />}
                </>
              }
              if (n.type === 'line') {
                return <>
                  <Line {...common} points={n.props.points} stroke={n.props.stroke} strokeWidth={n.props.strokeWidth} />
                  {selectedId===n.id && <Transformer nodes={[layerRef.current.findOne(node => node.getClassName && node.getClassName()==='Line' && node.x()===n.x && node.y()===n.y)]} rotateEnabled={true} enabledAnchors={['middle-left','middle-right']} />}
                </>
              }
              if (n.type === 'image') {
                return <EditableImage key={n.id} node={n} isSelected={selectedId===n.id} onSelect={() => setSelectedId(n.id)} onChange={updated => onNodeChange(updated)} />
              }
              return null
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
