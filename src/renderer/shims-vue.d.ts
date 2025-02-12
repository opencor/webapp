declare module '*.vue' {
  import * as vue from 'vue'

  const component: vue.DefineComponent<object, object, object>

  export default component
}
