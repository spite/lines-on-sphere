const shader = `
precision highp float;

uniform sampler2D texture;

varying vec2 vUv;

void main() {

	vec2 uv = vUv;
	uv.y = 1. - uv.y;
	vec4 c = texture2D( texture, uv ) - .01;
	gl_FragColor = c;

}`;

export { shader };
