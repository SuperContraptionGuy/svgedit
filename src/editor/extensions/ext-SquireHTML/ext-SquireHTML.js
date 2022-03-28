/**
 * @file ext-SquireHTML.js
 *
 * @copyright 2022 Hudson Kendall
 *
 */

/**
 * The purpose of this extension is to allow HTML objects to be inserted into SVG documents under
 *  foreignObject tag and edited with custom buttons with WYSIWYG HTML editing functions provided
 *  by Squire (https://github.com/neilj/Squire).  The goal to to merge SVG with HTML.
 */

const name = 'SquireHTML'

const loadExtensionTranslation = async function (svgEditor) {
  let translationModule
  const lang = svgEditor.configObj.pref('lang')
  try {
    translationModule = await import(`./locale/${lang}.js`)
  } catch (_error) {
    console.warn(`Missing translation (${lang}) for ${name} - using 'en'`)
    translationModule = await import('./locale/en.js')
  }
  svgEditor.i18next.addResourceBundle(lang, name, translationModule.default)
}

export default {
  name,
  async init ({ _importLocale }) {
    const svgEditor = this
    await loadExtensionTranslation(svgEditor)
    const { svgCanvas } = svgEditor
    const { $id, $click } = svgCanvas

    // stores the reference to newly added element between mouse events
    let newHTMLBox
    let started

    return {
      name: svgEditor.i18next.t(`${name}:name`),
      //name: name,
      callback () {
        // Add the button and its handler(s)
        const buttonTemplate = document.createElement('template')
        const title = `${name}:buttons.0.title`
        //const title = "Add Text (HTML)"
        buttonTemplate.innerHTML = `
  <se-button id="squirehtml" title="${title}" src="squirehtml.png"></se-button>
  `
        $id('tools_left').append(buttonTemplate.content.cloneNode(true))
        $click($id('squirehtml'), () => {
          // Makes the button look selected
          this.leftPanel.updateLeftPanel('squirehtml')
          svgCanvas.setMode('squirehtml')
        })
      },


      // This is triggered when the main mouse button is pressed down
      // on the editor canvas (not the tool panels)
      mouseDown (opts) {
        // Check the mode on mousedown
        if (svgCanvas.getMode() === 'squirehtml') {
          console.log("mouseDown")
          started = true
          // add a foreignObject tag with a div element inside
          newHTMLBox = svgCanvas.addSVGElementsFromJson({
            namespace:  "http://www.w3.org/2000/svg",
            element:  "foreignObject",
            attr:   {
              x:  opts.start_x,
              y:  opts.start_y,
              width:  0,
              height: 0,
              id: svgCanvas.getNextId()
            },
            children: [
              {
                namespace:  "http://www.w3.org/1999/xhtml",
                element:  "div",
                attr:   {
                  xmlns:  "http://www.w3.org/1999/xhtml",
                  style:  "overflow: hidden; border-style: dashed; height: 100%; display: block"
                },
                children: [
                  {
                    namespace:  "http://www.w3.org/1999/xhtml",
                    element:  "p",
                    attr:   {
                      //style:  "border-style: dotted;"
                    },
                    children:["this is a text node"]
                  }
                ]
              }
              // maybe I should add default <style> section here?
            ]
          })

          // The returned object must include "started" with
          // a value of true in order for mouseUp to be triggered
          return { started: true }
        }
        return undefined
      },

      mouseMove(opts) {
        // This is called just in case mouseMove is called before mouseDown is called for the first time.  It prevents the situation where newHTMLBox is undefined
        if (!started) {
          return undefined
        }
        if(svgCanvas.getMode() === 'squirehtml') {
          // get starting coordinates of drag from location of element
          const x0 = Number(newHTMLBox.getAttribute('x'))
          const y0 = Number(newHTMLBox.getAttribute('y'))

          let x = opts.mouse_x
          let y = opts.mouse_y

          newHTMLBox.setAttribute('width', x - x0)
          newHTMLBox.setAttribute('height', y - y0)

          // have to return this so mouseMove and mouseUp calls keep coming
          return { started: true }
        }

        // this call isn't for me.  by not returning started: true, I'll stop getting called.
        return undefined
      },

      // This is triggered from anywhere, but "started" must have been set
      // to true (see above). Note that "opts" is an object with event info
      mouseUp (opts) {
        // Check the mode on mouseup
        if (svgCanvas.getMode() === 'squirehtml') {
          console.log("mouseUp")

          // check for negative width or height
          let w = Number(newHTMLBox.getAttribute('width'))
          let h = Number(newHTMLBox.getAttribute('height'))
          let x = Number(newHTMLBox.getAttribute('x'))
          let y = Number(newHTMLBox.getAttribute('y'))
          if(w < 0) {
            newHTMLBox.setAttribute('x', x + w)
            newHTMLBox.setAttribute('w', -w)
          }
          if(h < 0) {
            newHTMLBox.setAttribute('y', y + h)
            newHTMLBox.setAttribute('h', -h)
          }

          return {
            keep: true,
            element: newHTMLBox
          }

          // example follows, skipped due to return
          const zoom = svgCanvas.getZoom()

          // Get the actual coordinate by dividing by the zoom value
          //const x = opts.mouse_x / zoom
          //const y = opts.mouse_y / zoom

          // We do our own formatting
          const text = svgEditor.i18next.t(`${name}:text`, { x, y })
          //const text = "I'm text bro"
          // Show the text using the custom alert function
          alert(text)
        }
      }
    }
  }
}
