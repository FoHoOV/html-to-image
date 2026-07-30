import * as htmlToImage from '../../src'
import { test } from '../fixtures'

describe('font embedding', () => {
  describe('should embed only used fonts', () => {
    test('should embed 1 font when use 1', async ({ getSvgDocument }) => {
      const root = document.createElement('div')
      document.body.append(root)
      try {
        root.innerHTML = `
          <style>
              @font-face { 
                  font-family: 'Font 0';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 1';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 2';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
          </style>
          <p style="font-family: 'Font 1'">Hello world</p>
        `
        const dataUrl = await htmlToImage.toDataUrl(root)
        const doc = await getSvgDocument(dataUrl)
        const [style] = Array.from(doc.getElementsByTagName('style'))
        expect(style.textContent).toContain('Font 1')
        expect(style.textContent).not.toContain('Font 0')
        expect(style.textContent).not.toContain('Font 2')
      } finally {
        root.remove()
      }
    })
    test('should embed 2 fonts when use 2', async ({ getSvgDocument }) => {
      const root = document.createElement('div')
      document.body.append(root)
      try {
        root.innerHTML = `
          <style>
              @font-face { 
                  font-family: 'Font 0';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 1';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 2';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
          </style>
          <p style="font-family: 'Font 0'">Hello world</p>
          <p style="font-family: 'Font 2'">Hello world</p>
        `
        const svg = await htmlToImage.toDataUrl(root)
        const doc = await getSvgDocument(svg)
        const [style] = Array.from(doc.getElementsByTagName('style'))
        expect(style.textContent).toContain('Font 0')
        expect(style.textContent).toContain('Font 2')
        expect(style.textContent).not.toContain('Font 1')
      } finally {
        root.remove()
      }
    })
    test('should embed font used by deeply nested child', async ({
      getSvgDocument,
    }) => {
      const root = document.createElement('div')
      document.body.append(root)
      try {
        root.innerHTML = `
          <style>
              @font-face { 
                  font-family: 'Font 0';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 1';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
              @font-face { 
                  font-family: 'Font 2';
                  src: url('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2');
              }
          </style>
          <div>
            <div>
                <div>
                    <div style="font-family: 'Font 1'">Hello world</div>
                </div>
            </div>
          </div>
        `
        const svg = await htmlToImage.toDataUrl(root)
        const doc = await getSvgDocument(svg)
        const [style] = Array.from(doc.getElementsByTagName('style'))
        expect(style.textContent).toContain('Font 1')
        expect(style.textContent).not.toContain('Font 0')
        expect(style.textContent).not.toContain('Font 2')
      } finally {
        root.remove()
      }
    })
  })
})
