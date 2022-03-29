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

    //console.log(document.activeElement)
    // might be a little sketch
    const svgeditBody = document.activeElement

    // stores the reference to newly added element between mouse events
    let newHTMLBox
    let started

    // object to hold references to all the squire editor instances
    //  TODO:
    //    -create editors squireEditors.svg_1 = new Squire(editorDiv, {block-type: "p"....})
    //    -focus/defocus editors  squireEditors.svg_1.focus() or  squireEditors.svg_1.blur()
    //    -destroy editors with squireEditors.svg_1.destroy(); delete squireEditors.svg_1
    let squireEditors = {};

    const initializeSquire = (foreignObjectContainer) => {
      let editorRoot = foreignObjectContainer.querySelector("div.SquireHTML-editor")
      if(editorRoot == undefined) {
        // sometimes the tag is capitalized, ask svg-edit why.  THIS is a major issue.
        editorRoot = foreignObjectContainer.querySelector("DIV.SquireHTML-editor")
        if(editorRoot == undefined) {
          // can't find the div, probably not here.  can't create editor
          return false
        }
      }
      // take the first one found
      console.log(editorRoot)
      //editorRoot = editorRoot[0]

      let editorTemp = new Squire(editorRoot, {blockTag: 'p' })
      squireEditors[foreignObjectContainer.id] = editorTemp

      // successfully created new editor
      return true

    }

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
              id: svgCanvas.getNextId(),
              shape:  "html"  // for identifying Squire-editable html trees
            },
            children: [
              {
                namespace:  "http://www.w3.org/1999/xhtml",
                element:  "div",
                attr:   {
                  xmlns:  "http://www.w3.org/1999/xhtml",
                  class: "SquireHTML-editor",
                  style:  "overflow: hidden; border-style: dashed; height: 100%; display: block; text-align: start"
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
      
      // used to initialize new Squire editors if the appropriate foreignObject and div tags are found and then adds the new object to the squireEditors[] array

      // This is triggered from anywhere, but "started" must have been set
      // to true (see above). Note that "opts" is an object with event info
      mouseUp (opts) {
        // Check the mode on mouseup
        if (svgCanvas.getMode() === 'squirehtml') {
          console.log("mouseUp")

          // check for negative width or height.  Might be broken
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

          //let editorDiv = document.getElementById("SquireHTML-editor")
    //    -create editors squireEditors.svg_1 = new Squire(editorDiv, {block-type: "p"....})
    //    -focus/defocus editors  squireEditors.svg_1.focus() or  squireEditors.svg_1.blur()
    //    -destroy editors with squireEditors.svg_1.destroy(); delete squireEditors.svg_1

          // create new editor:
          //squireEditors[newHTMLBox.id] = new Squire(newHTMLBox.querySelector("div.SquireHTML-editor"), { blockTag: 'p' })
          if(initializeSquire(newHTMLBox)) {
            // to help monitor the focus states for debugging
            squireEditors[newHTMLBox.id].addEventListener('focus', () => {console.log("Squire gained focus") })
            squireEditors[newHTMLBox.id].addEventListener('blur', () => { console.log("Squire lost focus") })
            // focus is achieved through selectedChanged callback.
            //squireEditors[newHTMLBox.id].focus()

            svgCanvas.setMode("select")
          }

          return {
            keep: true,
            element: newHTMLBox
          }
        }
      },

      // use the selectedChanged callback to manage which foreignObject's Squire instance currently has focus, and to defocus if none of them are selected any longer.


      selectedChanged (opts) {
        console.log("selectedChanged called")
        let selElems = opts.elems
        console.log(opts.elems)
        console.log("currently focused element: ")
        console.log(document.activeElement)

        // defocus all
        Object.values(squireEditors).forEach(editorInstance => {
          editorInstance.blur()
        })
        // give focus back to svg-edit by giving it to the body element
        svgeditBody.focus()

        let i = selElems.length
        while (i--) {
          const elem = selElems[i]
          // check that the element is a Squire-editable html element and set focus
          if (elem?.getAttribute('shape') === 'html') {
            // check that only one is selected
            if (opts.selectedElement && !opts.multiselected) {
              if( elem.id in squireEditors) {
                squireEditors[elem.id].focus()
              } else {
                // TODO create a new editor for an object that hasn't got one yet (like one that was loaded from a file rather than created during the current session)
                // The tricky part is that squire will erase everything inside the html tag it's given.  The original content will have to be copied in after
                if(initializeSquire(elem)) {
                  // give new editor focus
                  squireEditors[elem.id].focus()
                  // TODO: copy in original html here somewhere
                }
              }
              // TODO: show the editor panel when after it's developed
              //showPanel(true, 'star')
            } else {
              // hide the panel and defocus the editors

              //showPanel(false, 'star')
            }
          }
        }
      }
    }
  }
}
