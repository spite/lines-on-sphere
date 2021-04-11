const shader = `
precision highp float;

attribute vec3 position;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform sampler2D positions;

void main() {

	vec2 uv = position.xy;
	vec3 p = 100. * texture2D( positions, uv ).xyz;
	vec4 mvPosition = modelViewMatrix * vec4( p, 1. );
	gl_PointSize = 1. * ( 300.0 / -mvPosition.z );
	gl_Position = projectionMatrix * mvPosition;

}`;

export { shader };
