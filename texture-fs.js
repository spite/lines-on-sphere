const shader = `
precision highp float;

void main() {

	vec2 uv = gl_PointCoord;
	float d = length( uv - .5 );
	if( d > .5 ) {
		discard;
	}
	gl_FragColor = vec4(1.);
}
`;

export { shader };
