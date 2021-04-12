const shader = `
precision highp float;

attribute vec3 position;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform sampler2D positions;
uniform vec2 dimensions;
uniform float pointSize;

#define M_PI 3.1415926535897932384626433832795

varying float life;

float azimuth( vec3 vector ) {
	return atan( vector.z, - 1.0 * vector.x );
}

float inclination( vec3 vector ) {
	return atan( - vector.y, sqrt( ( vector.x * vector.x ) + ( vector.z * vector.z ) ) );
}

void main() {

	vec2 uv = position.xy;
	vec4 c = texture2D( positions, uv );
	vec3 p = 500. * c.xyz;

	vec2 uv2 = vec2( azimuth( p ) / 2. / M_PI + 0.5, inclination( p ) / M_PI + 0.5 );

	float x = uv2.x - .5;
	float y = uv2.y - .5;

	p.xyz = vec3( vec2( x, y ) * dimensions, 0. );

	life = c.a/100.;
	gl_PointSize = 1.;//	life * 10.;//pointSize;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1. );

}`;

export { shader };
