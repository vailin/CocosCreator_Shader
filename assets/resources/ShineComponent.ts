import CustoMaterial from "./CustomMaterial";
const { ccclass, property, executeInEditMode, requireComponent } = cc._decorator;
let renderer = cc.renderer.renderEngine.renderer;
@ccclass
@executeInEditMode//启动此选项可在主页获得更新
@requireComponent(cc.Sprite)
export default class ShineComponent extends cc.Component {
    @property(cc.Sprite)
    sprite: cc.Sprite = null;
    @property()
    shader_length = 10.;
    @property()
    add_time: any = 2;
    @property()
    PlayOnLoad: any = false;
    @property(cc.Color)
    shader_color: cc.Color = new cc.Color(255, 255, 255, 255);
    material: CustoMaterial = null;
    draw_img: cc.Texture2D = null;
    //测试的是否发现一个BUG所以写了很多没用的东西 将就着看吧 有的时候cc.Load获取的SpriteFrame中的texture不是继承与cc.Texture2D 而是继承于cc.RenderTexture 所以其实和这个没关系
    _spriteMaterial: any = null;
    _load_texture: any = null;
    _save_texture: any = null;
    _SpriteFrame: any = null;
    _ShineFrame: any = null;
    time: any = 0.5;
    addnum: any = 0.5;
    onLoad() {
    }
    start() {
        //没有设定精灵的时候获取自身精灵
        if (this.sprite == null) {
            this.sprite = this.node.getComponent(cc.Sprite);
        }
        //外发光着色器代码 我写的很烂 
        var material = new CustoMaterial("ShineCustom", `
        uniform mat4 viewProj;
        attribute vec3 a_position;
        attribute vec2 a_uv0;
        varying vec2 uv0;
        void main () {
            vec4 pos = viewProj * vec4(a_position, 1);
            gl_Position = pos;
            uv0 = a_uv0;
        }
        `,
            `
        uniform sampler2D texture;
        uniform vec4 color;
        uniform vec2 size;
        uniform float len;
        uniform float time;
        varying vec2 uv0;
        void main () {
            vec4 uv_color = texture2D(texture, uv0);
            if(uv_color.a == 0.0){
                float chang = len/5.0;
                float num = 0.0;
                for(float x = -5.0 ; x <= 5.0 ; x++){
                    for(float y = -5.0 ; y <= 5.0 ; y++){
                        float posx = uv0.x+x/size.x*chang;
                        float posy = uv0.y+y/size.x*chang;
                        vec2 uv2 = vec2(posx,posy);
                        vec4 uv2_color = texture2D(texture,uv2);
                        if(uv2_color.a > 0.0){
                            num = num+1.0;
                        }
                    } 
                } 
                if(num > 0.0){
                    uv_color = color;
                    uv_color.a = num/50.0*time;
                }
            }
            gl_FragColor =uv_color;
        } 
        `, 
        //变量defines 不知道干嘛用的 反正不能为Null
        []
        , 
            //声明着色器使用到那些自定义变量
            [
                { name: 'texture', type: renderer.PARAM_TEXTURE_2D },
                { name: 'color', type: renderer.PARAM_COLOR4 },
                { name: 'size', type: renderer.PARAM_FLOAT2 },
                { name: 'len', type: renderer.PARAM_FLOAT },
                { name: 'time', type: renderer.PARAM_FLOAT },
            ]);
        let sprite: any = this.sprite;
        //缓存精灵的默认着色器
        this._spriteMaterial = sprite._spriteMaterial;
        //修改精灵的state 在检查这个变量的时候 发现 如何setState(1)会是精灵变黑 最后才发现原来精灵的默认着色器中 还有一个灰色的着色器
        sprite._state = "ShineCustom";
        //获取精灵的纹理
        let texture = this.sprite.spriteFrame.getTexture();
        //保存精灵的纹理
        this._save_texture = texture;
        this._SpriteFrame = this.sprite.spriteFrame;
        //声明一个自定义纹理 如果没有声明特殊要求可以不声明 直接用精灵的纹理
        let frame_texture = new cc.RenderTexture();
        this._load_texture = frame_texture;
        //对自定义纹理初始化 我不太清楚别人则么做的 我做外发光Shader的时候因为图片的关系 外发光到图片边缘之后无法继续衍生 所以用了一个自定义纹理解决这个问题
        frame_texture.initWithSize(this.sprite.node.width + this.shader_length * 2, this.sprite.node.height + this.shader_length * 2)
        //这个步骤其实也可以省略 检查先前的BUG的时候写的 
        this._ShineFrame = new cc.SpriteFrame();
        this._ShineFrame.setTexture(frame_texture)
        //-----------
        console.log(texture)
        //给着色器的自定义变量传入属性
        material.setTexture("texture", texture);
        material.setSize("size", this.sprite.node.width, this.sprite.node.height);
        material.setProperty("len", this.shader_length);
        material.setProperty("time", 1)
        if (this.shader_color) {
            var color = this.shader_color;
            material.setColor("color", color.getR() / 255, color.getG() / 255, color.getB() / 255, color.getA() / 255)
        }
        this.material = material;
        material.updateHash();
        if (this.PlayOnLoad) {
            this.applyShader();
        }
    }
    applyShader() {
        let sprite: any = this.sprite;
        sprite._spriteMaterial = this.material;
        //精灵的_material变量 渲染的时候 会调用这个变量
        sprite._material = this.material;
        //sprite.spriteFrame.texture = this._load_texture;
        sprite.spriteFrame = this._ShineFrame;
        sprite._state = "ShineCustom";
        console.log("加载Shine")
    }
    cancelShader() {
        let sprite: any = this.sprite;
        //sprite.spriteFrame.texture =this._save_texture;
        //因为我使用了自定义的texture  所以这里要归还最初的sprite的纹理
        sprite.spriteFrame = this._SpriteFrame;
        //归还默认的着色器
        sprite._spriteMaterial = this._spriteMaterial;
        //设置状态
        /**检查了setState代码
         * 只有_state的内容 和你设置的值不一样时才会生效 去改写 着色器
         * 如果不想修改默认着色器 请直接给_material变量赋值
         * sprite._material= =  this._spriteMaterial;
         */
        sprite.setState(0);
    }
    update(dt) {
        if (this.material) {
            this.time += this.addnum;;
            if (this.time > 1) {
                this.time = 1;
                this.addnum = -1 / (60 * this.add_time * 0.6);
            } if (this.time < 0.4) {
                this.addnum = 1 / (60 * this.add_time * 0.6);
            }
            this.material.setProperty("time", this.time)
        }

    }
}
