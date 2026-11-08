'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

interface ImportResult {
  imported: number
  errors: string[]
}

interface ExcelImportProps {
  distributorId: string
  onImportComplete?: (result: ImportResult) => void
}

export default function ExcelImport({ distributorId, onImportComplete }: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile)
        parsePreview(droppedFile)
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile)
        parsePreview(selectedFile)
      }
    }
  }

  function parsePreview(selectedFile: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(worksheet)
      setPreview(rows.slice(0, 10)) // Show first 10 rows
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  async function handleImport() {
    if (!file) return

    setImporting(true)
    setResult(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const response = await fetch('/api/supplier/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: Array.from(new Uint8Array(arrayBuffer)),
          distributorId,
        }),
      })

      const data = await response.json()
      setResult(data)
      onImportComplete?.(data)
    } catch (err) {
      setResult({ imported: 0, errors: [`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`] })
    } finally {
      setImporting(false)
    }
  }

  function handleRemoveFile() {
    setFile(null)
    setPreview([])
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          id="excel-upload"
        />
        <label htmlFor="excel-upload" className="cursor-pointer">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-2 text-lg text-gray-600">Drag & drop Excel file here, or click to browse</p>
          <p className="mt-1 text-sm text-gray-500">Supports .xlsx and .xls files</p>
        </label>
      </div>

      {file && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {preview.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.SKU || ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.Name || ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{row.Category || ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{row.Unit || ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.Price !== undefined ? row.Price : ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{row.Stock !== undefined ? row.Stock : ''}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{row.MinOrderQty !== undefined ? row.MinOrderQty : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length >= 10 && (
                <p className="mt-2 text-sm text-gray-500 text-center">Showing first 10 of {preview.length + '+'} rows</p>
              )}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      )}

      {result && (
        <div className={`rounded-lg p-4 ${result.imported > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className="font-medium text-gray-900 mb-2">
            {result.imported > 0 ? 'Import Successful' : 'Import Failed'}
          </h3>
          <p className="text-sm text-gray-700">
            Imported: <span className="font-medium">{result.imported}</span> products
          </p>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700">Errors:</p>
              <ul className="mt-1 list-disc list-inside text-sm text-red-700 max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}