
const renderEngine = cc.renderer.renderEngine;
//Creator 绘制前调用的类 反正我也不知道啥原理
const Material = renderEngine.Material;
//请让类继承自Material
export default class ShaderMaterial extends Material {
    //类初始化
    constructor(name: string, vert?: string, frag?: string, defines?: any[], param?: any[]) {
        super(false);
        //这个其实是基于别人的代码写的 
        /**
         * name是缓存名称 如果相同的name你在运行时无论如何更改 定点着色器 和管线着色器 都是无效的
         * defines的作用我并不明白 如果有大佬知道请一定要告诉我 QQ:471596741
         * param 这个参数是我自己定义的 为了用这个类的时候可以动态传一些变量 
         */
        let renderer = cc.renderer as any;
        let lib = renderer._forward._programLib;
        //这个应该是着色器的缓存吧
        !lib._templates[name] && lib.define(name, vert, frag, defines);
        this._init(name, param);
    }

    private _init(name: string, param: any[]) {
        let renderer = renderEngine.renderer;
        let gfx = renderEngine.gfx;
        if (!param) {
            param = [];
        }
        //这个方法应该是真正的实例化着色器
        let pass = new renderer.Pass(name);
        //设置深度？翻译是这个 作用不清楚 请知道的大佬 QQ告诉我 或论坛留言 十分感谢
        pass.setDepth(false, false);
        //同上
        pass.setCullMode(gfx.CULL_NONE);
        //同上
        pass.setBlend(
            gfx.BLEND_FUNC_ADD,
            gfx.BLEND_SRC_ALPHA, gfx.BLEND_ONE_MINUS_SRC_ALPHA,
            gfx.BLEND_FUNC_ADD,
            gfx.BLEND_SRC_ALPHA, gfx.BLEND_ONE_MINUS_SRC_ALPHA
        );
        //反正就是个类 应该是用来运行着色器的  param也就是我自定义的参数是一个JSON  规定了着色器中用于接受那些自定义变量
        /**例子
         * 如果着色器代码中有这句声明 代表size来自传入变量 
         *   uniform vec2 size;
         * 
         *  param 
         *  就需要是
         * { name: 'size', type: renderer.PARAM_FLOAT2 }
         * 
         * type是变量的类型 具体请看如下每个参数对应的类型
         *
        //
        // [
        //     { name: 'texture', type: renderer.PARAM_TEXTURE_2D },
        //     { name: 'color', type: renderer.PARAM_COLOR4 },
        //     { name: 'pos', type: renderer.PARAM_FLOAT3 },
        //     { name: 'size', type: renderer.PARAM_FLOAT2 },
        //     { name: 'time', type: renderer.PARAM_FLOAT },
        //     { name: 'num', type: renderer.PARAM_FLOAT }
        // ]
        // 
        // color = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
        // pos = { x: 0.0, y: 0.0, z: 0.0 };
        // size = { x: 0.0, y: 0.0 };
        // time = 0.0;
        // num = 0.0;
            texture比较特殊 他是texture的源文件 其实声明文件不重要 事件用的时候其实关键是targetID
            所以 你其实可以从比如Label RichText中扒拉到texture然后给Label使用着色器 比如外发光 描边什么的效果 具体没有操作我 我只是 有这个想法 觉得可行
            获取方法
            sprite.spriteFrame._texture.getImpl()
         */


        let mainTech = new renderer.Technique(
            ['transparent'],
            param,
            [pass]
        );
        var effect_param = {}
        for (var key in param) {
            var p = param[key];
            var value = p.value;
            var type = p.type;
            if (!value) {
                switch (type) {
                    case renderer.PARAM_COLOR4:
                        value = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
                        break;
                    case renderer.PARAM_FLOAT2:
                        value = { x: 0.0, y: 0.0 };
                        break
                    case renderer.PARAM_FLOAT3:
                        value = { x: 0.0, y: 0.0, z: 0.0 };
                        break;
                    case renderer.PARAM_FLOAT:
                        value = 0.0;
                        break;
                }
            }
            effect_param[p.name] = value;
        }
        this._effect = this.effect = new renderer.Effect([mainTech], effect_param, []);
        this._mainTech = mainTech;
    }
    //设置属性
    setProperty(name, value) {
        /**
         * 调用setProperty的方法可以把变量传入着色器中
         */
        this._effect.setProperty(name, value);
    }
    setTexture(name, texture) {
        texture.update({ flipY: false, mipmap: false });
        this._effect.setProperty(name, texture.getImpl());
    }

    setColor(name, r, g, b, a) {
        let color: any = {}
        color.r = r;
        color.g = g;
        color.b = b;
        color.a = a;
        this._effect.setProperty(name, color);
    }

    setPos(name, x, y, z) {
        let pos: any = {}
        pos.x = x;
        pos.y = y;
        pos.z = z;
        this._effect.setProperty(name, this._pos);
    }
    setSize(name, x, y) {
        let size: any = {}
        size.x = x;
        size.y = y;
        this._effect.setProperty(name, size);
    }
}